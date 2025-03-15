require('dotenv').config( { path: '../.env' });
const express = require('express');
const connectDB = require('./database/connection');

const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5173;

connectDB();

app.use(cors());  // Add this line to enable CORS for all origins
app.use(express.json());

// Import Routes
const userRoutes = require('./routes/userRoutes');
const pinRoutes = require('./routes/pinRoutes');

// Register Routes
app.use('/api/users', userRoutes);
app.use('/api/pins', pinRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
