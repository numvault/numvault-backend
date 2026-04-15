const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const smsbower = require('../services/smsbower');
const pool = require('../db');

router.get('/services', authMiddleware, async (req, res) => {
  try {
    const services = await smsbower.getServices();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.get('/prices/:service', authMiddleware, async (req, res) => {
  try {
    const prices = await smsbower.getPrices(req.params.service);
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { service, country } = req.body;
    const userId = req.user.id;

    const prices = await smsbower.getPrices(service);
    const countryData = prices[service]?.countries?.[country || '0'];
    const basePrice = countryData?.cost || 0.5;
    const finalPrice = smsbower.getPriceWithMargin(basePrice);

    const userResult = await pool.query('SELECT balance FROM users WHERE id=$1', [userId]);
    const userBalance = parseFloat(userResult.rows[0].balance);

    if (userBalance < finalPrice)
      return res.status(400).json({ error: 'Insufficient balance' });

    const { activationId, phone } = await smsbower.getNumber(service, country || '0');

    await pool.query('UPDATE users SET balance = balance - $1 WHERE id=$2', [finalPrice, userId]);

    const expires = new Date(Date.now() + 20 * 60 * 1000);
    await pool.query(
      'INSERT INTO activations (user_id, activation_id, phone_number, service, country, cost, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [userId, activationId, phone, service, country || '0', finalPrice, expires]
    );

    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, status, description) VALUES ($1,$2,$3,$4,$5)',
      [userId, 'purchase', finalPrice, 'completed', `Number purchase: ${service}`]
    );

    res.json({ activationId, phone, cost: finalPrice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get number' });
  }
});

router.get('/status/:activationId', authMiddleware, async (req, res) => {
  try {
    const status = await smsbower.getStatus(req.params.activationId);
    if (status.startsWith('STATUS_OK')) {
      const code = status.split(':')[1];
      await pool.query(
        'UPDATE activations SET sms_code=$1, status=$2 WHERE activation_id=$3 AND user_id=$4',
        [code, 'completed', req.params.activationId, req.user.id]
      );
    }
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.post('/cancel/:activationId', authMiddleware, async (req, res) => {
  try {
    await smsbower.setStatus(req.params.activationId, 8);
    await pool.query(
      'UPDATE activations SET status=$1 WHERE activation_id=$2 AND user_id=$3',
      ['cancelled', req.params.activationId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

router.get('/my-activations', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM activations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;