const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const { convertCurrency } = require('../utilities/externalApis');

const router = express.Router();
const prisma = new PrismaClient();

// Submit a new expense
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { amount, currency, category, description, expense_date } = req.body;
        const userId = req.user.id;
        const companyId = req.user.companyId;

        // Perform mock currency conversion to a base currency (e.g. USD)
        const baseAmount = await convertCurrency(amount, currency, 'USD');

        const expense = await prisma.expense.create({
            data: {
                user_id: userId,
                company_id: companyId,
                amount: parseFloat(baseAmount),
                currency: 'USD',
                category,
                description,
                expense_date: new Date(expense_date || Date.now()),
                status: 'PENDING'
            }
        });

        res.status(201).json({ message: 'Expense submitted successfully', expense });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit expense' });
    }
});

// Fetch expenses via Role
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { role, id: userId, companyId } = req.user;
        let expenses = [];

        if (role === 'ADMIN' || role === 'MANAGER') {
            expenses = await prisma.expense.findMany({
                where: { company_id: companyId },
                include: { user: true }
            });
        } else {
            // Employee only sees theirs
            expenses = await prisma.expense.findMany({
                where: { user_id: userId }
            });
        }

        res.json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

module.exports = router;
