const express = require('express');
const Pin = require('../models/Pin');
const User = require('../models/User');

const router = express.Router();

// Create a new Pin
router.post('/create', async (req, res) => {
    try {
        const { pin_id, song, user_id, latitude, longitude } = req.body;

        // Check if user exists
        const user = await User.findOne({ user_id });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Create the pin with location
        const pin = new Pin({
            pin_id,
            song,
            user_id,
            location: {
                type: "Point",
                coordinates: [longitude, latitude]  // MongoDB stores as [lng, lat]
            }
        });

        await pin.save();
        res.status(201).json({ message: "Pin created successfully", pin });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Get all Pins for a User
router.get('/user/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        // Find pins where user_id is a string (not ObjectId)
        const pins = await Pin.find({ user_id: user_id }).populate('user_id', 'username');

        res.status(200).json(pins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/nearby', async (req, res) => {
    try {
        const { latitude, longitude, maxDistance } = req.query;

        const pins = await Pin.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    $maxDistance: parseInt(maxDistance) || 5000  // Default: 5km radius
                }
            }
        });

        res.status(200).json(pins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;
