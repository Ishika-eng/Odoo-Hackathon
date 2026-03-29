/**
 * Utility functions for parsing OCR extracted text from receipts.
 */

// Regular expressions and heuristics
const AMOUNT_REGEX = /(?:total|amount|amt)[\s]*[:=]?[\s]*(?:rs\.?|inr|₹|\$|€|usd)?[\s]*(\d+(?:,\d{3})*(?:\.\d{2}))/i;
const SIMPLE_AMOUNT_REGEX = /(?:rs\.?|inr|₹|\$|€|usd)[\s]*(\d+(?:,\d{3})*(?:\.\d{2}))/i;

const DATE_REGEXES = [
  /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/, // YYYY-MM-DD or YYYY/MM/DD
  /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/, // DD-MM-YYYY or DD/MM/YYYY or MM/DD/YYYY
  /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/i // DD Mon YYYY
];

const CATEGORIES = {
  Food: ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food', 'dining', 'swiggy', 'zomato', 'dominos', 'mcdonalds'],
  Travel: ['cab', 'taxi', 'uber', 'ola', 'flight', 'airline', 'irctc', 'train', 'bus', 'fuel', 'petrol', 'toll'],
  Hotel: ['hotel', 'stay', 'airbnb', 'oyo', 'room'],
  Office_Supplies: ['stationery', 'paper', 'pen', 'laptop', 'hardware', 'software', 'aws', 'cloud', 'hosting']
};

/**
 * Parses the raw text to extract structured data.
 * @param {string} rawText 
 * @returns {Object} Structured data
 */
const parseReceiptData = (rawText) => {
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const textLower = rawText.toLowerCase();

  // Extract Vendor (Heuristic: usually the first non-empty line that contains letters)
  let vendor = null;
  for (const line of lines) {
    if (/[a-zA-Z]/.test(line) && line.length > 2) {
      // Clean up common noise
      vendor = line.replace(/[^a-zA-Z0-9\s&]/g, '').trim();
      break;
    }
  }

  // Extract Amount
  let amount = null;
  const amountMatch = rawText.match(AMOUNT_REGEX);
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  } else {
    // Try simple regex
    const allMatches = [...rawText.matchAll(SIMPLE_AMOUNT_REGEX)];
    if (allMatches.length > 0) {
      // Pick the largest amount found (often the total)
      let maxAmt = 0;
      for (const m of allMatches) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (val > maxAmt) maxAmt = val;
      }
      if (maxAmt > 0) amount = maxAmt;
    }
  }

  // Extract Currency
  let currency = 'INR'; // Default
  if (textLower.includes('$') || textLower.includes('usd')) currency = 'USD';
  else if (textLower.includes('€') || textLower.includes('eur')) currency = 'EUR';

  // Extract Date
  let date = null;
  for (const regex of DATE_REGEXES) {
    const match = rawText.match(regex);
    if (match) {
      date = match[0];
      // Normalize to ISO if possible
      try {
        const isoDate = new Date(date).toISOString();
        if (isoDate !== 'Invalid Date') {
          date = isoDate;
        }
      } catch (e) {
        // keep original if parsing fails
      }
      break;
    }
  }

  // Extract Category
  let category = 'Other';
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      category = cat.replace('_', ' ');
      break;
    }
  }

  // Determine an overall text confidence score (heuristic based on valid parsed fields)
  let confidence = 0;
  if (amount) confidence += 40;
  if (date) confidence += 30;
  if (vendor) confidence += 20;
  if (category !== 'Other') confidence += 10;

  return {
    amount,
    currency,
    date,
    vendor,
    category,
    confidence
  };
};

module.exports = {
  parseReceiptData
};
