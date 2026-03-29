const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const expensesRoutes = require('./routes/expenses');
const receiptsRoutes = require('./routes/receipts');
const approvalsRoutes = require('./routes/approval.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Main API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/approvals', approvalsRoutes);

// Meta API for Frontend forms (Country & Currency Dropdowns)
const { getCountriesAndCurrencies } = require('./utilities/externalApis');
app.get('/api/countries', async (req, res) => {
    try {
        const data = await getCountriesAndCurrencies();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch country configurations' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
