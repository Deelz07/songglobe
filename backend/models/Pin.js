const mongoose = require('mongoose');
const autoIncrement = require('mongoose-sequence')(mongoose);  // Import mongoose-sequence

const PinSchema = new mongoose.Schema({
    pin_id: { type: Number, unique: true },
    song: { type: String, required: true },
    date_time: { type: Date, default: Date.now },
    user_id: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true },  // [longitude, latitude]
    }
});

// Use the autoIncrement plugin on the pin_id field
PinSchema.plugin(autoIncrement, { inc_field: 'pin_id' });

const Pin = mongoose.model('Pin', PinSchema);

module.exports = Pin;
