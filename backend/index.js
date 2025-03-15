require('dotenv').config( { path: '../.env' });
const express = require('express');
const connectDB = require('./database/connection');

const app = express();
const PORT = process.env.PORT || 5173;

connectDB();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
