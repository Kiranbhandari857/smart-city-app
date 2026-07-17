require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session'); 
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs'); 

// Third-Party Middleware & Integrations
const rateLimit = require('express-rate-limit'); // For API rate limiting
const cron = require('node-cron');               // For scheduling background tasks
const { createClient } = require('redis');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Local Modules & Controllers
const connectDB = require('./config/db');
const authController = require('./controllers/authController');
const complaintController = require('./controllers/complaintController');
const chatController = require('./controllers/chatController');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secure-smart-city-api-key';

// Initialize Database Connection
connectDB();

// Express App Configuration
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Configuration
app.use(session({
    secret: process.env.JWT_SECRET || 'super-secure-smart-city-api-key',
    resave: false,
    saveUninitialized: false,
}));

// Google OAuth 2.0 Configuration (Passport)
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Load from environment variables
    callbackURL: "https://smart-city-app-nr5j.onrender.com/auth/google/callback"
},
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/user-login' }),
  function(req, res) {
    // Convert Google's 21-digit numeric ID to a 24-character hex string for MongoDB compatibility
    const hexId = BigInt(req.user.id).toString(16).padStart(24, '0');
    
    // Save the converted ID to the active session
    req.session.userId = hexId; 
    res.redirect('/dashboard');
  }
);

// API Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 100, // Limit each IP to 100 requests per window
    message: "Too many requests from this IP, please try again later."
});
app.use('/api/', apiLimiter);

// Redis Connection & Scheduled Cron Jobs
const redisClient = createClient({
    url: 'rediss://default:gQAAAAAAAcODAAIgcDE2OTc2Y2YwZDM3NWU0YTY1OTJkZmZhNjkwOTAyMWEwYg@special-toucan-115587.upstash.io:6379'
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect().then(() => console.log('⚡ Redis Cloud Connected!'));
app.locals.redisClient = redisClient; 

// Hourly system maintenance task
cron.schedule('0 * * * *', () => {
    console.log('⏳ [Background Job] Running hourly system maintenance...');
});

// File Upload Configuration (Multer)
const uploadDir = './public/uploads/';

// Ensure upload directory exists on startup
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

// Authentication & Authorization Middleware
const requireAdmin = (req, res, next) => { 
    if (req.session.isAdmin) next(); 
    else res.redirect('/login'); 
};

const requireUser = (req, res, next) => { 
    if (req.session.userId) next(); 
    else res.redirect('/user-login'); 
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ success: false, message: "No token provided." });
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) return res.status(401).json({ success: false, message: "Invalid Token." });
        req.user = decodedUser; 
        next();
    });
};

// Frontend Web Routes (Views)
app.get('/', (req, res) => { res.render('portals', { pageTitle: 'Welcome Hub | Smart City' }); });
app.get('/report', requireUser, (req, res) => { res.render('index', { pageTitle: 'File a Report', user: req.session.userId }); });

// Authentication Routes 
app.get('/register', (req, res) => res.render('register', { pageTitle: 'Citizen Registration' }));
app.post('/register', authController.registerCitizen);
app.get('/user-login', (req, res) => res.render('user-login', { pageTitle: 'Citizen Login' }));
app.post('/user-login', authController.loginCitizen);
app.get('/login', (req, res) => res.render('login', { pageTitle: 'Admin Login' }));
app.post('/login', authController.loginAdmin);
app.get('/logout', authController.logout);

// Citizen Complaint Routes 
app.post('/submit-complaint', requireUser, upload.single('image'), complaintController.submitComplaint);
app.get('/dashboard', requireUser, complaintController.getDashboard);

// Administrator Routes 
app.get('/admin', requireAdmin, complaintController.getAdminDashboard);
app.post('/resolve-complaint/:id', requireAdmin, complaintController.resolveComplaint);

// REST API Routes
app.post('/api/login', authController.apiLogin);
app.post('/api/chat', chatController.handleChat);
app.get('/api/my-complaints', verifyToken, complaintController.apiGetMyComplaints);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});