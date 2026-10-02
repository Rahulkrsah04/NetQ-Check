const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

/**
 * POST /api/scan/upload
 * Upload a product label image for OCR processing
 */
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // In production, this would trigger the OCR pipeline
    // For now, return the file info for the frontend to process
    res.json({
      success: true,
      fileId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      message: 'Image uploaded successfully',
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to process image' });
  }
});

/**
 * GET /api/scan/:scanId
 * Retrieve a specific scan by ID
 */
router.get('/:scanId', async (req, res) => {
  // TODO: Fetch from Firestore/MongoDB
  res.json({ message: 'Scan retrieval not yet implemented. Using demo data.' });
});

module.exports = router;
