const Tesseract = require('tesseract.js');
const path = require('path');

class OCRService {
  /**
   * Extract text from a receipt image using Tesseract.js
   * @param {string} filePath - absolute path to the image
   * @returns {Promise<object>} - parsed receipt data
   */
  async processReceipt(filePath) {
    try {
      const absolutePath = path.resolve(filePath);

      // Run Tesseract OCR
      const { data } = await Tesseract.recognize(absolutePath, 'eng', {
        logger: () => {} // suppress logs
      });

      const rawText = data.text;

      // Parse structured data from the raw OCR text
      const parsed = this.parseReceiptText(rawText);

      return {
        success: true,
        rawText,
        ...parsed
      };
    } catch (err) {
      console.error('OCR processing error:', err.message);
      return {
        success: false,
        rawText: '',
        items: [],
        totalAmount: 0,
        currency: 'USD',
        date: null,
        vendor: null,
        error: err.message
      };
    }
  }

  /**
   * Parse raw OCR text to extract structured receipt data
   */
  parseReceiptText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const items = [];
    let totalAmount = 0;
    let date = null;
    let vendor = null;

    // Try to extract vendor (usually first non-empty line)
    if (lines.length > 0) {
      vendor = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim() || null;
    }

    // Date patterns: MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.
    const datePatterns = [
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{1,2}[\s,]+\d{2,4})/i
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          date = match[1];
          break;
        }
      }
      if (date) break;
    }

    // Detect Currency
    let currency = 'USD'; // default
    const textLower = text.toLowerCase();
    if (text.includes('€') || textLower.includes('eur')) currency = 'EUR';
    else if (text.includes('£') || textLower.includes('gbp')) currency = 'GBP';
    else if (text.includes('₹') || textLower.includes('inr')) currency = 'INR';
    else if (text.includes('$') || textLower.includes('usd')) currency = 'USD';

    // Extract items: look for lines with prices (number with decimal)
    const pricePattern = /[€£$₹]?\s*(\d+[.,]\d{2})\s*$/;
    const totalPatterns = [
      /(?:total|grand\s*total|amount\s*due|balance\s*due|sum)\s*:?\s*[€£$₹]?\s*(\d+[.,]\d{2})/i,
      /[€£$₹]?\s*(\d+[.,]\d{2})\s*(?:total)/i
    ];

    // Extract total first
    for (const line of lines) {
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          totalAmount = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }
      if (totalAmount > 0) break;
    }

    // Extract line items
    for (const line of lines) {
      // Skip lines that are likely headers, totals, or very short
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('total') || lowerLine.includes('subtotal') ||
          lowerLine.includes('tax') || lowerLine.includes('change') ||
          lowerLine.includes('cash') || lowerLine.includes('card') ||
          lowerLine.includes('visa') || lowerLine.includes('mastercard') ||
          line.length < 3) {
        continue;
      }

      const priceMatch = line.match(pricePattern);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        let itemName = line.replace(pricePattern, '').trim();

        // Try to extract quantity
        let quantity = 1;
        const qtyMatch = itemName.match(/^(\d+)\s*[xX@]\s*/);
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1]);
          itemName = itemName.replace(qtyMatch[0], '').trim();
        }

        if (itemName.length > 1 && price > 0) {
          items.push({
            name: itemName.substring(0, 100),
            quantity,
            price: price,
            total: price * quantity
          });
        }
      }
    }

    // If no total found from patterns, sum up items
    if (totalAmount === 0 && items.length > 0) {
      totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    }

    // If no items found, try to at least get the total as a single item
    if (items.length === 0 && totalAmount > 0) {
      items.push({
        name: 'Receipt item',
        quantity: 1,
        price: totalAmount,
        total: totalAmount
      });
    }

    return {
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency,
      date,
      vendor
    };
  }
}

module.exports = new OCRService();
