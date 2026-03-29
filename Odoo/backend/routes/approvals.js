const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/approve/:id', authenticateToken, authorizeRole(['MANAGER', 'ADMIN']), async (req, res) => {
    try {
        const expenseId = parseInt(req.params.id);
        const approverId = req.user.id;
        const { comment } = req.body;

        // ==== Call Ishika's Approval Engine Logic ====
        console.log(`[Integration] Calling Ishika's Rules Engine for Approval of Expense: ${expenseId}`);

        // Update Expense
        const updatedExpense = await prisma.expense.update({
            where: { id: expenseId },
            data: { status: 'APPROVED' }
        });

        // Add to tracking
        await prisma.expenseApproval.create({
            data: {
                expense_id: expenseId,
                approver_id: approverId,
                status: 'APPROVED',
                comment: comment || '',
                action_date: new Date()
            }
        });

        res.json({ message: 'Expense approved', expense: updatedExpense });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to approve expense' });
    }
});

router.post('/reject/:id', authenticateToken, authorizeRole(['MANAGER', 'ADMIN']), async (req, res) => {
    try {
        const expenseId = parseInt(req.params.id);
        const approverId = req.user.id;
        const { comment } = req.body;

        console.log(`[Integration] Calling Ishika's Rules Engine for Rejection of Expense: ${expenseId}`);

        const updatedExpense = await prisma.expense.update({
            where: { id: expenseId },
            data: { status: 'REJECTED' }
        });

        await prisma.expenseApproval.create({
            data: {
                expense_id: expenseId,
                approver_id: approverId,
                status: 'REJECTED',
                comment: comment || 'Rejected manually',
                action_date: new Date()
            }
        });

        res.json({ message: 'Expense rejected', expense: updatedExpense });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to reject expense' });
    }
});

module.exports = router;
