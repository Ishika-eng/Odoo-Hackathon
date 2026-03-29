const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

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
        // Wait for actual DB to be available.
        // Assuming user passwords are plain text for simplicity in this mock, normally we'd compare bcrypt hashes.
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
        console.error("Login attempt failed (could be missing DB):", error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
