const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/profile', auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, username, balance, is_admin FROM users WHERE id=$1',
      [req.user.id]
    );
    const statsResult = await pool.query(
      'SELECT COUNT(*) as total_activations, COALESCE(SUM(cost),0) as total_spent FROM activations WHERE user_id=$1',
      [req.user.id]
    );
    res.json({ user: userResult.rows[0], stats: statsResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM activations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ activations: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
