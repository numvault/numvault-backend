const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password)
      return res.status(400).json({ error: 'All fields required' });

    const exists = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ error: 'Email or username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, username, password) VALUES ($1,$2,$3) RETURNING id, email, username, balance',
      [email, username, hashed]
    );

    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: result.rows[0] })