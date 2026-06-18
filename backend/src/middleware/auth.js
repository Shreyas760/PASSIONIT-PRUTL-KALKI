import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const createToken = (user) => {
  return jwt.sign({ sub: user.username }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '24h',
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
};

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
}; 