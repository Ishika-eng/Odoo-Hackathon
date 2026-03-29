const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token.
 * Assumes Authentication is handled by another team and a Bearer token is provided.
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    // For the sake of this module, we use a placeholder secret
    // In production, this should match the secret used by the Auth service
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        // If token is invalid, log but allow pass-through if we want to test locally easily.
        // For strict enforcement, return 403.
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }
};

module.exports = authenticateJWT;
