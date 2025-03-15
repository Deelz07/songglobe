const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },  // Unique user identifier
    username: { type: String, required: true },  // Display name
}, { timestamps: true });  // Adds createdAt & updatedAt

const User = mongoose.model('User', UserSchema);
module.exports = User;
