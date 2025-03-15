const express = require('express');
const User = require('../models/User');

const router = express.Router();

// Create a new user
router.post('/register', async (req, res) => {
    try {
        const { user_id, username } = req.body;
        const user = new User({ user_id, username });
        await user.save();
        res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
