const axios = require('axios');
const Complaint = require('../models/Complaint');

// 1. Submit a New Complaint
exports.submitComplaint = async (req, res) => {
    try {
        const uploadedFilePath = req.file ? '/uploads/' + req.file.filename : null;

        await Complaint.create({
            title: req.body.title,
            category: req.body.category,
            priority: req.body.priority,
            location: req.body.location,
            description: req.body.description,
            userId: req.session.userId,
            imageUrl: uploadedFilePath
        });
        res.redirect('/dashboard?success=true');
    } catch (error) {
        console.error(error);
        res.status(500).send('<h2 style="color:red; text-align:center;">Server Error: Could not save data</h2>');
    }
};

// 2. Load Citizen Dashboard
exports.getDashboard = async (req, res) => {
    try {
        // Grab the Redis client configured in app.js
        const redisClient = req.app.locals.redisClient;

        // ---------------------------------------------------------
        // EXPERT TASKS 7 & 8: External API & Redis Cloud Caching
        // ---------------------------------------------------------
        let weatherData;
        const cachedWeather = await redisClient.get("cityWeather"); // Try to get data from Redis first

        if (!cachedWeather) {
            // Task 7: External API Integration (Open-Meteo Free API)
            console.log("Fetching fresh weather data from External API...");
            const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current_weather=true');
            weatherData = weatherRes.data.current_weather;
            
            // Task 8: Server-Side Caching Mechanism (Save to Redis for 1 hour)
            await redisClient.setEx("cityWeather", 3600, JSON.stringify(weatherData));
        } else {
            console.log("Loaded weather data instantly from Redis Cloud Cache!");
            weatherData = JSON.parse(cachedWeather);
        }
        // ---------------------------------------------------------

        // Fetch user complaints to display on the dashboard
        const userComplaints = await Complaint.find({ userId: req.session.userId }).sort({ createdAt: -1 });

        // Normal Dashboard Logic
        res.render('dashboard', { 
            pageTitle: 'Citizen Dashboard',
            user: req.session.userId,
            weather: weatherData, // Pass the live weather data to the frontend
            complaints: userComplaints // Pass the user's complaints to the frontend
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send("Error loading dashboard");
    }
};

// 3. Load Admin Dashboard
exports.getAdminDashboard = async (req, res) => {
    try {
        const allComplaints = await Complaint.find().sort({ createdAt: -1 });
        res.render('admin', { pageTitle: 'Admin Dashboard', complaints: allComplaints });
    } catch (error) {
        res.status(500).send("Server Error");
    }
};

// 4. Resolve an Issue (Admin)
exports.resolveComplaint = async (req, res) => {
    try {
        await Complaint.findByIdAndUpdate(req.params.id, { status: 'Resolved' });
        res.redirect('/admin');
    } catch (error) {
        res.status(500).send("Server Error");
    }
};

// 5. API: Get complaints for mobile app
exports.apiGetMyComplaints = async (req, res) => {
    try {
        const userComplaints = await Complaint.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json({ success: true, count: userComplaints.length, data: userComplaints });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch complaints" });
    }
};