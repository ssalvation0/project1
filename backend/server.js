
console.log('Start');
// server.js

console.log('Before express import');
const express = require('express');
console.log('After express import');
console.log('Before mongoose import');
const mongoose = require('mongoose');
console.log('After mongoose import');
console.log('Before cors import');
const cors = require('cors');
console.log('After cors import');
console.log('Before transmogRoutes import');
const transmogRoutes = require('./routes/transmogRoutes');
console.log('After transmogRoutes import');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
console.log('Before mongoose.connect');
const mongoURI = 'mongodb://localhost:27017/wowtransmog';
mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 5000, // 5 секунд
    connectTimeoutMS: 5000,
})
    .then(() => console.log('MongoDB is connected!'))
    .catch(err => console.error('MongoDB connection error:', err));
console.log('After mongoose.connect (promise created)');

mongoose.connection.on('connecting', () => {
    console.log('Mongoose: connecting...');
});
mongoose.connection.on('connected', () => {
    console.log('Mongoose: connected');
});
mongoose.connection.on('error', (err) => {
    console.error('Mongoose: connection error:', err);
});
mongoose.connection.on('disconnected', () => {
    console.log('Mongoose: disconnected');
});
mongoose.connection.on('reconnected', () => {
    console.log('Mongoose: reconnected');
});

// Routes
app.get('/', (req, res) => {
    res.send('Server is running!');
});
app.use('/api/transmogs', transmogRoutes);

// Start the server

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown for nodemon restarts
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    server.close(() => {
        console.log('Process interrupted');
        process.exit(0);
    });
});