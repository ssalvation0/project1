// backend/models/Transmog.js

const mongoose = require('mongoose');

const transmogSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['Cloth', 'Leather', 'Mail', 'Plate', 'Weapon', 'Shield'], required: true },
    source: { type: String, required: true },
    location: { type: String },
    imageURL: { type: String, required: true }
});

module.exports = mongoose.model('Transmog', transmogSchema);