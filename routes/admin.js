const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../db');

const adminCheck = async (req, res, next) => {
  const result = await pool.query('SELECT is_admin FROM users WHERE id=$1', [req.user.id]);
  if (!result.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
};

router.get('/users', authMiddleware, adminCheck, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, username, balance, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/transactions', authMiddleware, adminCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.username FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       ORDER BY t.created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/add-balance', authMiddleware, adminCheck, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    await pool.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [amount, userId]);
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, status, description) VALUES ($1,$2,$3,$4,$5)',
      [userId, 'deposit', amount, 'completed', 'Manual balance add by admin']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', authMiddleware, adminCheck, async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const revenue = await pool.query("SELECT SUM(amount) FROM transactions WHERE type='deposit' AND status='completed'");
    const purchases = await pool.query('SELECT COUNT(*) FROM activations');
    res.json({
      totalUsers: users.rows[0].count,
      totalRevenue: revenue.rows[0].sum || 0,
      totalPurchases: purchases.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
