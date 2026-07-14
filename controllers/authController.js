const User = require('../models/User');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'super-secure-smart-city-api-key';

// 1. Citizen Registration
exports.registerCitizen = async (req, res) => {
    try {
        const newUser = await User.create({
            fullName: req.body.fullName,
            email: req.body.email,
            password: req.body.password 
        });
        req.session.userId = newUser._id; 
        res.redirect('/dashboard'); 
    } catch (error) {
        res.send('<h2 style="color:red; text-align:center;">❌ Error: Email might already exist.</h2>');
    }
};

// 2. Citizen Web Login
exports.loginCitizen = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (user) {
            req.session.userId = user._id; 
            res.redirect('/dashboard');
        } else {
            res.send('<h2 style="color:red; text-align:center;">❌ Invalid Credentials.</h2>');
        }
    } catch (error) {
        res.status(500).send("Server Error");
    }
};

// 3. Admin Login & Logout
exports.loginAdmin = (req, res) => {
    if (req.body.username === 'admin' && req.body.password === 'admin123') {
        req.session.isAdmin = true; 
        res.redirect('/admin');
    } else {
        res.send('<h2 style="color:red; text-align:center;">❌ Invalid Credentials.</h2>');
    }
};

exports.logout = (req, res) => {
    req.session.destroy(); 
    res.redirect('/');
};

// 4. API Token Login
exports.apiLogin = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
        
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ success: true, token: token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};