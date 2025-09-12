// backend/routes/transmogRoutes.js

const express = require('express');
const router = express.Router();
const Transmog = require('../models/Transmog');

// Get all transmogs
router.get('/', async (req, res) => {
    try {
        const transmogs = await Transmog.find();
        res.json(transmogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a new transmog
router.post('/', async (req, res) => {
    const transmog = new Transmog(req.body);
    try {
        const newTransmog = await transmog.save();
        res.status(201).json(newTransmog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await Transmog.findByIdAndDelete(req.params.id);

        if (!result) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json({ message: "Item successfully deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;