const express = require('express');
const Pin = require('../models/Pin');
const User = require('../models/User');

const router = express.Router();

const DEFAULT_RADIUS = 5000

// Create a new Pin
router.post('/create', async (req, res) => {
    try {
        const { song, user_id, location } = req.body;
        const [latitude, longitude] = location.coordinates;

        // Log the incoming data for debugging
        console.log(req.body)

        // Check if user exists
        const user = await User.findOne({ user_id });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Log the location data for debugging
        console.log('Creating pin with location:', { coordinates: [longitude, latitude] });

        // Create the pin with location (coordinates should now be valid)
        const pin = new Pin({
            song,
            user_id,
            location: {
                type: "Point",
                coordinates: [longitude, latitude],  // MongoDB stores as [longitude, latitude]
            },
        });

        // Save the pin
        await pin.save();
        res.status(201).json({ message: "Pin created successfully", pin });
    } catch (error) {
        console.error(error);  // Log the error for debugging
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

// get all pins within default radius of a click
router.get('/nearby', async (req, res) => {
    try {
        const { latitude, longitude, maxDistance } = req.query;

        const pins = await Pin.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    $maxDistance: parseInt(maxDistance) || DEFAULT_RADIUS
                }
            }
        });

        res.status(200).json(pins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pin by pin_id
router.get('/:id', async (req, res) => {
    try {
        const pin = await Pin.findOne({ pin_id: req.params.id });
        if (!pin) {
            return res.status(404).json({ message: 'Pin not found' });
        }
        res.status(200).json(pin);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Get all pins CAN REMOVE LATER, JUST USED TO TEST
router.get('/', async (req, res) => {
    try {
        const pins = await Pin.find({});
        res.json(pins);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
