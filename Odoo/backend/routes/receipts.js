const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { performOCR } = require('../utilities/externalApis');

const router = express.Router();
const prisma = new PrismaClient();

// Upload receipt
router.post('/upload', authenticateToken, upload.single('receiptImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const { expenseId } = req.body; 

        // OCR logic will extract data from the image here
        const extractedData = await performOCR(filePath);

        // Store into receipts table
        let savedReceipt = null;
        if (expenseId) {
            savedReceipt = await prisma.receipt.create({
                data: {
                    expense_id: parseInt(expenseId),
                    file_url: filePath,
                    extracted_data: extractedData
                }
            });
        } // Otherwise it can be returned for the frontend to submit together later

        res.json({
            message: 'Receipt uploaded successfully',
            filePath,
            extractedData,
            savedReceipt
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process receipt' });
    }
});

module.exports = router;
