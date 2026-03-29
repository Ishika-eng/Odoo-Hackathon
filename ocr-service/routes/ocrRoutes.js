const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const authenticateJWT = require('../middleware/authMiddleware');
const { uploadReceipt } = require('../controllers/ocrController');

// POST /api/ocr/upload-receipt
// 1. authenticateJWT: Validate token
// 2. upload.single('receipt'): Handle file upload via Multer (field name should be 'receipt')
// 3. uploadReceipt: Process image and return JSON
router.post('/upload-receipt', authenticateJWT, upload.single('receipt'), uploadReceipt);

module.exports = router;
