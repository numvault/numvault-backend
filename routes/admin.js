const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

function adminOnly(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM activations) as total_activations,
        (SELECT COALESCE(SUM(cost),0) FROM activations WHERE status='completed') as total_revenue
    `);
    const usersResult = await pool.query(
      'SELECT id, email, username, balance, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ stats: statsResult.rows[0], users: usersResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/add-balance', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, amount } = req.body;
    if (!user_id || !amount) return res.status(400).json({ error: 'user_id and amount required' });
    await pool.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [amount, user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
