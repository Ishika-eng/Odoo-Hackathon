const { extractTextFromImage } = require('../services/ocrService');
const { parseReceiptData } = require('../utils/parsers');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Handles receipt upload, OCR processing, and DB storage.
 */
const uploadReceipt = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file uploaded' });
  }

  const imagePath = req.file.path;

  try {
    // 1. Extract raw text from the image
    const rawText = await extractTextFromImage(imagePath);

    if (!rawText || rawText.trim().length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Could not detect any text in the uploaded image. Please ensure the image is clear.'
      });
    }

    // 2. Parse structured data from raw text
    const structuredData = parseReceiptData(rawText);

    // 3. Save results to Database (Prisma)
    const ocrRecord = await prisma.oCRReceipt.create({
      data: {
        extractedText: rawText,
        amount: structuredData.amount,
        date: structuredData.date ? new Date(structuredData.date) : null,
        vendor: structuredData.vendor,
        category: structuredData.category,
        confidence: structuredData.confidence,
        currency: structuredData.currency,
        // expenseId: null -> will be linked later when the user confirms the expense creation
      }
    });

    // 4. Return clean JSON response
    return res.status(200).json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        ocrId: ocrRecord.id,
        amount: structuredData.amount,
        currency: structuredData.currency,
        date: structuredData.date,
        vendor: structuredData.vendor,
        category: structuredData.category,
        confidence: structuredData.confidence,
        raw_text: rawText
      }
    });

  } catch (error) {
    console.error('Error in uploadReceipt controller:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during OCR processing',
      error: error.message
    });
  }
};

module.exports = {
  uploadReceipt
};
