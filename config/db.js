const mongoose = require('mongoose');
require('dotenv').config(); // 👈 NEW: Tells Node to unlock the .env safe

const connectDB = async () => {
    try {
        // 👈 NEW: Uses your cloud URI instead of local memory
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`☁️  MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error connecting to database: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;