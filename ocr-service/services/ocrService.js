const Tesseract = require('tesseract.js');
const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

/**
 * Preprocesses the image to improve OCR accuracy.
 * Converts to grayscale, increases contrast, and resizes if necessary.
 * @param {string} imagePath 
 * @returns {string} Path to the processed image
 */
const preprocessImage = async (imagePath) => {
  try {
    const minImageWidth = 1000;
    const image = await Jimp.read(imagePath);
    
    // Resize if too small (Tesseract needs standard size for good results)
    if (image.bitmap.width < minImageWidth) {
      image.resize(minImageWidth, Jimp.AUTO);
    }

    image
      .greyscale() // Convert to grayscale
      .contrast(0.2) // Increase contrast
      .normalize(); // Normalize colors

    const processedPath = imagePath.replace(path.extname(imagePath), '_processed.jpg');
    await image.write(processedPath);
    
    return processedPath;
  } catch (error) {
    console.error('Image preprocessing failed. Falling back to original image.', error);
    return imagePath;
  }
};

/**
 * Extracts text from an image using Tesseract.js.
 * @param {string} imagePath Local path to the uploaded image
 * @returns {Promise<string>} Extracted raw text
 */
const extractTextFromImage = async (imagePath) => {
  let processedImagePath = imagePath;
  let rawText = '';

  try {
    // 1. Preprocess the image
    processedImagePath = await preprocessImage(imagePath);

    // 2. Run OCR
    const { data: { text } } = await Tesseract.recognize(
      processedImagePath,
      'eng',
      { logger: m => console.log(m) } // Optional: logs progress
    );

    rawText = text;

  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  } finally {
    // 3. Clean up the processed temporary image if it was created
    if (processedImagePath !== imagePath && fs.existsSync(processedImagePath)) {
      try {
        fs.unlinkSync(processedImagePath);
      } catch (cleanupErr) {
        console.error('Failed to clean up processed image:', cleanupErr);
      }
    }
  }

  return rawText;
};

module.exports = {
  extractTextFromImage
};
