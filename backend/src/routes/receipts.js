const express = require('express');
const path = require('path');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ocrService = require('../services/ocrService');

const router = express.Router();

// POST /api/receipts/upload — Upload receipt and process OCR
router.post('/upload', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/receipts/${req.file.filename}`;

    // Process OCR
    const ocrResult = await ocrService.processReceipt(filePath);

    // If an expenseId is provided, link receipt directly
    const expenseId = req.body.expenseId ? parseInt(req.body.expenseId) : null;

    if (expenseId) {
      // Update expense receipt_url
      await query(
        `UPDATE expenses SET receipt_url = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [fileUrl, expenseId, req.user.id]
      );
    }

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        fileUrl,
        ocr: {
          vendor: ocrResult.vendor,
          date: ocrResult.date,
          items: ocrResult.items,
          totalAmount: ocrResult.totalAmount,
          rawText: ocrResult.rawText
        }
      }
    });
  } catch (err) {
    console.error('Receipt upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to process receipt' });
  }
});

// POST /api/receipts/upload-and-create — Upload receipt, OCR, and auto-create expense
router.post('/upload-and-create', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/receipts/${req.file.filename}`;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Process OCR
    const ocrResult = await ocrService.processReceipt(filePath);

    // Create expense from OCR data
    const title = ocrResult.vendor ? `Receipt - ${ocrResult.vendor}` : 'Receipt Expense';
    const amount = ocrResult.totalAmount || 0;
    const description = ocrResult.items.map(i => `${i.name}: $${i.price}`).join(', ') || 'Scanned receipt';

    const expResult = await query(
      `INSERT INTO expenses (company_id, user_id, title, description, amount, currency, receipt_url, status)
       VALUES ($1, $2, $3, $4, $5, 'USD', $6, 'PENDING')
       RETURNING *`,
      [companyId, userId, title, description, amount, fileUrl]
    );

    const expense = expResult.rows[0];

    res.json({
      success: true,
      message: 'Receipt scanned and expense created',
      data: {
        expense,
        fileUrl,
        ocr: {
          vendor: ocrResult.vendor,
          date: ocrResult.date,
          items: ocrResult.items,
          totalAmount: ocrResult.totalAmount
        }
      }
    });
  } catch (err) {
    console.error('Receipt upload-and-create error:', err);
    res.status(500).json({ success: false, message: 'Failed to process receipt' });
  }
});

module.exports = router;
