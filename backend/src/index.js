const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const approvalRoutes = require('./routes/approval.routes');

// Person 2 will add auth/expenses routes
// const authRoutes = require('./routes/auth.routes');
// const expenseRoutes = require('./routes/expense.routes'); 

app.use('/api/approvals', approvalRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/expenses', expenseRoutes);

// Mock endpoints so frontend development can happen before Person 2 finishes
app.get('/api/users/mock', (req, res) => {
  res.json([
    { id: '1', name: 'Admin User', role: 'ADMIN', company_id: '123' },
    { id: '2', name: 'Manager Bob', role: 'MANAGER', company_id: '123' },
    { id: '3', name: 'Finance Sarah', role: 'MANAGER', company_id: '123' },
    { id: '4', name: 'Employee Alice', role: 'EMPLOYEE', company_id: '123' },
  ]);
});

app.post('/api/auth/login/mock', (req, res) => {
  const { email } = req.body;
  // Mock login: Just send back a serialized JSON token based on who logged in
  let role = 'EMPLOYEE';
  if (email.includes('admin')) role = 'ADMIN';
  if (email.includes('manager')) role = 'MANAGER';

  const userObj = {
    id: `u_${Date.now()}`,
    name: email.split('@')[0],
    role,
    company_id: '123'
  };

  res.json({ token: JSON.stringify(userObj), user: userObj });
});

// A dummy expense GET to make developing frontend easier
app.get('/api/expenses/mock', (req, res) => {
  res.json([
    { id: 'e1', amount: 120.0, currency: 'USD', category: 'TRAVEL', description: 'Flight to NYC', expense_date: '2023-11-01', status: 'PENDING', company_id: '123', paid_by: 'Employee Alice', remarks: 'Client meeting', user: { name: 'Employee Alice' }, items: [] },
    { id: 'e2', amount: 45.0, currency: 'EUR', category: 'MEALS', description: 'Lunch', expense_date: '2023-11-02', status: 'APPROVED', company_id: '123', paid_by: 'Employee Alice', remarks: '', user: { name: 'Employee Alice' }, items: [] },
    { id: 'e3', amount: 5467.0, currency: 'INR', category: 'EQUIPMENT', description: 'New Monitor', expense_date: '2023-11-05', status: 'DRAFT', company_id: '123', paid_by: 'Employee Alice', remarks: 'Needs to be billed to IT', user: { name: 'Employee Alice' }, items: [] },
  ]);
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Approval Engine running on port ${PORT}`);
});
