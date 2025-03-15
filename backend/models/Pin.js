const mongoose = require('mongoose');

const PinSchema = new mongoose.Schema({
    pin_id: { type: String, required: true, unique: true },  // Unique Pin ID
    song: { type: String, required: true },  // Song name or Spotify ID
    date_time: { type: Date, default: Date.now },  // Auto timestamps
    user_id: { type: String, required: true },  // Store as string, not ObjectId

    location: {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true },  // [longitude, latitude]
    }
});

const Pin = mongoose.model('Pin', PinSchema);
module.exports = Pin;
