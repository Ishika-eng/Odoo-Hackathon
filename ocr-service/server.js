require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const ocrRoutes = require('./routes/ocrRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded local files if needed (Optional, usually uploads are private)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/ocr', ocrRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'OCR Service is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`OCR Service listening on port ${PORT}`);
});
