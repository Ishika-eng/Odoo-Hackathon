const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ocrService = require('../services/ocrService');

const router = express.Router();

// POST /api/ocr/extract — Upload receipt, return structured data ONLY
router.post('/extract', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/receipts/${req.file.filename}`;

    // Process OCR
    const ocrResult = await ocrService.processReceipt(filePath);

    res.json({
      success: true,
      message: 'OCR extracted successfully',
      data: {
        fileUrl,
        merchant: ocrResult.vendor,
        date: ocrResult.date,
        total: ocrResult.totalAmount,
        currency: ocrResult.currency,
        items: ocrResult.items || [],
        rawText: ocrResult.rawText
      }
    });
  } catch (err) {
    console.error('OCR extract error:', err);
    res.status(500).json({ success: false, message: 'Failed to process OCR' });
  }
});

module.exports = router;
