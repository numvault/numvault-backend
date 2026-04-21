const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const SMSBOWER_API = 'https://smsbower.app/stubs/handler_api.php';
const API_KEY = process.env.SMSBOWER_API_KEY;
const PROFIT_MARGIN = parseFloat(process.env.PROFIT_MARGIN || 1.3);

async function smsApi(params) {
  const url = new URL(SMSBOWER_API);
  url.searchParams.set('api_key', API_KEY);
  for (const [k
