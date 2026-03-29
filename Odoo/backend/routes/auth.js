const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

const router = express.Router();
const prisma = new PrismaClient();

// 1. Sign Up Endpoint
router.post('/signup', async (req, res) => {
    const { name, email, password, company_id } = req.body;
    
    // Validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!password || password.trim().length === 0) {
        return res.status(400).json({ error: 'Password cannot be empty' });
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Create new user explicitly defaulting to EMPLOYEE
        const newUser = await prisma.user.create({
            data: {
                name: name || '',
                email,
                password, // Placeholder: Normally would be bcrypt hashed before insert
                role: 'EMPLOYEE',
                company_id: company_id ? parseInt(company_id) : null
            }
        });

        res.status(201).json({ message: 'User registered successfully as EMPLOYEE. Admin must assign manager role.', user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to sign up user' });
    }
});

// 2. Login Endpoint
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Input Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!password || password.trim().length === 0) {
        return res.status(400).json({ error: 'Password cannot be empty' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { company: true }
        });

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, companyId: user.company_id },
            process.env.JWT_SECRET || 'super_secret_hackathon_key',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company: user.company?.name
            }
        });

    } catch (error) {
        console.error("Login attempt failed:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Admin Assigns Roles Endpoint
router.put('/assign-role/:userId', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { newRole, managerId } = req.body;

    const validRoles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!validRoles.includes(newRole)) {
        return res.status(400).json({ error: 'Invalid role provided. Must be ADMIN, MANAGER, or EMPLOYEE' });
    }

    try {
        const updateData = { role: newRole };
        
        // If assigning them as an employee to a specific manager, set manager_id
        if (managerId) {
            updateData.manager_id = parseInt(managerId);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        res.json({ message: `User successfully upgraded to ${newRole}`, user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to assign role' });
    }
});

module.exports = router;
