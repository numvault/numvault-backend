const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const pool = require('../db');

const NOWPAYMENTS_API = 'https://api.nowpayments.io/v1';
const NOWPAYMENTS_KEY = process.env.NOWPAYMENTS_API_KEY;

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || amount < 1)
      return res.status(400).json({ error: 'Minimum deposit is $1' });

    const response = await axios.post(
      `${NOWPAYMENTS_API}/payment`,
      {
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: currency || 'usdttrc20',
        order_id: `user_${req.user.id}_${Date.now()}`,
        order_description: `Balance deposit for user ${req.user.id}`,
        ipn_callback_url: `${process.env.BACKEND_URL}/api/payment/webhook`
      },
      { headers: { 'x-api-key': NOWPAYMENTS_KEY } }
    );

    const payment = response.data;
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, status, payment_id, crypto_currency, description) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [req.user.id, 'deposit', amount, 'pending', payment.payment_id, currency, 'Balance deposit']
    );

    res.json({
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      status: payment.payment_status
    });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.get('/status/:paymentId', authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(
      `${NOWPAYMENTS_API}/payment/${req.params.paymentId}`,
      { headers: { 'x-api-key': NOWPAYMENTS_KEY } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check payment' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const { payment_id, payment_status, price_amount } = req.body;
    if (payment_status === 'finished' || payment_status === 'confirmed') {
      const txResult = await pool.query(
        'SELECT * FROM transactions WHERE payment_id=$1 AND status=$2',
        [payment_id, 'pending']
      );
      if (txResult.rows.length > 0) {
        const tx = txResult.rows[0];
        await pool.query(
          'UPDATE transactions SET status=$1 WHERE payment_id=$2',
          ['completed', payment_id]
        );
        await pool.query(
          'UPDATE users SET balance = balance + $1 WHERE id=$2',
          [tx.amount, tx.user_id]
        );
      }
    }
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Webhook error' });
  }
});

router.get('/currencies', async (req, res) => {
  try {
    const response = await axios.get(`${NOWPAYMENTS_API}/currencies`, {
      headers: { 'x-api-key': NOWPAYMENTS_KEY }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

module.exports = router;