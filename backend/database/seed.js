require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Pin = require('../models/Pin');
const connectDB = require('./connection');

async function seedDatabase() {
    try {
        await connectDB();  // Connect to MongoDB

        console.log("Seeding database...");

        // Sample Users
        const users = [
            { user_id: "12345", username: "Alice" },
            { user_id: "67890", username: "Bob" }
        ];

        // Insert Users
        await User.deleteMany();  // Clear existing data
        await User.insertMany(users);
        console.log("Users seeded!");

        // Sample Pins
        const pins = [
            {
                pin_id: "p001",
                song: "Shape of You",
                user_id: "12345",
                location: { type: "Point", coordinates: [-74.006, 40.7128] } // NYC
            },
            {
                pin_id: "p002",
                song: "Blinding Lights",
                user_id: "67890",
                location: { type: "Point", coordinates: [-118.2437, 34.0522] } // LA
            }
        ];

        // Insert Pins
        await Pin.deleteMany();  // Clear existing data
        await Pin.insertMany(pins);
        console.log("Pins seeded!");

        console.log("Database seeding complete.");
        mongoose.connection.close();  // Close connection after seeding
    } catch (error) {
        console.error("Error seeding database:", error);
        mongoose.connection.close();
    }
}

seedDatabase();
