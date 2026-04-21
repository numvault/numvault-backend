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
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const r = await fetch(url.toString());
  const text = await r.text();
  return text;
}

router.get('/services', auth, async (req, res) => {
  try {
    const text = await smsApi({ action: 'getPrices' });
    const data = JSON.parse(text);
    const services = [];
    for (const [service, countries] of Object.entries(data)) {
      const prices = Object.values(countries).map(c => parseFloat(c.cost || 0));
      const minPrice = prices.length ? Math.min(...prices) * PROFIT_MARGIN : 0.1;
      services.push({ code: service, name: formatServiceName(service), min_price: minPrice });
    }
    services.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ services });
  } catch (err) {
    console.error('Services error:', err.message);
    res.status(500).json({ error: 'Failed to load services' });
  }
});

router.get('/countries', auth, async (req, res) => {
  try {
    const { service } = req.query;
    const text = await smsApi({ action: 'getPrices', service });
    const data = JSON.parse(text);
    const serviceData = data[service] || {};
    const countries = Object.entries(serviceData).map(([code, info]) => ({
      code,
      name: getCountryName(code),
      price: (parseFloat(info.cost || 0.1) * PROFIT_MARGIN).toFixed(2),
      count: info.count || 0
    })).filter(c => c.count > 0).sort((a, b) => a.name.localeCompare(b.name));
    res.json({ countries });
  } catch (err) {
    console.error('Countries error:', err.message);
    res.status(500).json({ error: 'Failed to load countries' });
  }
});

router.post('/buy', auth, async (req, res) => {
  try {
    const { service, country } = req.body;
    if (!service || !country) return res.status(400).json({ error: 'Service and country required' });
    const priceText = await smsApi({ action: 'getPrices', service });
    const priceData = JSON.parse(priceText);
    const countryData = priceData[service]?.[country];
    if (!countryData) return res.status(400).json({ error: 'Service not available for this country' });
    const cost = parseFloat(countryData.cost || 0.1) * PROFIT_MARGIN;
    const userResult = await pool.query('SELECT balance FROM users WHERE id=$1', [req.user.id]);
    const balance = parseFloat(userResult.rows[0].balance);
    if (balance < cost) return res.status(400).json({ error: 'Insufficient balance' });
    const buyText = await smsApi({ action: 'getNumber', service, country });
    if (!buyText.startsWith('ACCESS_NUMBER')) {
      return res.status(400).json({ error: buyText || 'Failed to get number' });
    }
    const parts = buyText.split(':');
    const activationId = parts[1];
    const phone = parts[2];
    await pool.query('UPDATE users SET balance = balance - $1 WHERE id=$2', [cost, req.user.id]);
    await pool.query(
      'INSERT INTO activations (user_id, activation_id, phone_number, service, country, cost, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [req.user.id, activationId, phone, service, country, cost, 'pending']
    );
    const newBalance = balance - cost;
    res.json({ activation_id: activationId, phone, cost: cost.toFixed(2), new_balance: newBalance.toFixed(2) });
  } catch (err) {
    console.error('Buy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/check/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const text = await smsApi({ action: 'getStatus', id });
    if (text.startsWith('STATUS_OK')) {
      const code = text.split(':')[1];
      await pool.query('UPDATE activations SET sms_code=$1, status=$2 WHERE activation_id=$3 AND user_id=$4',
        [code, 'completed', id, req.user.id]);
      return res.json({ status: 'completed', sms_code: code });
    }
    if (text === 'STATUS_WAIT_CODE') return res.json({ status: 'waiting' });
    if (text === 'STATUS_CANCEL') return res.json({ status: 'cancelled' });
    res.json({ status: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cancel/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    await smsApi({ action: 'setStatus', id, status: 8 });
    await pool.query('UPDATE activations SET status=$1 WHERE activation_id=$2 AND user_id=$3',
      ['cancelled', id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatServiceName(code) {
  const names = {
    wa:'WhatsApp',tg:'Telegram',fb:'Facebook',ig:'Instagram',
    tw:'Twitter/X',yt:'YouTube',go:'Google',am:'Amazon',
    ap:'Apple',ms:'Microsoft',nf:'Netflix',sp:'Spotify',
    tt:'TikTok',li:'LinkedIn',dc:'Discord',ub:'Uber',
    vk:'VK',ok:'OK.ru',vi:'Viber',sk:'Skype',
  };
  return names[code] || code.toUpperCase();
}

function getCountryName(code) {
  const names = {
    '0':'Russia','1':'Ukraine','2':'Kazakhstan','3':'China',
    '4':'Philippines','5':'Myanmar','6':'Indonesia','7':'Malaysia',
    '8':'Kenya','9':'Tanzania','10':'Vietnam','11':'Kyrgyzstan',
    '12':'USA','13':'Israel','14':'Hong Kong','15':'Poland',
    '16':'England','17':'Madagascar','18':'Congo','19':'Nigeria',
    '20':'Macau','21':'Egypt','22':'India','23':'Ireland',
    '24':'Cambodia','25':'Laos','26':'Haiti','27':'Ivory Coast',
    '28':'Gambia','29':'Serbia','30':'Yemen','31':'South Africa',
    '32':'Romania','33':'Colombia','34':'Estonia','35':'Azerbaijan',
    '36':'Canada','37':'Morocco','38':'Ghana','39':'Argentina',
    '40':'Uzbekistan','41':'Cameroon','42':'Chad','43':'Germany',
    '44':'Lithuania','45':'Croatia','46':'Sweden','47':'Iraq',
    '48':'Netherlands','49':'Latvia','50':'Austria',
    '51':'Belarus','52':'Thailand','53':'Saudi Arabia',
    '54':'Mexico','55':'Taiwan','56':'Spain','57':'Iran',
    '58':'Algeria','59':'Slovenia','60':'Bangladesh',
    '61':'Senegal','62':'Turkey','63':'Czech Republic',
    '64':'Sri Lanka','65':'Peru','66':'Pakistan','67':'New Zealand',
    '68':'Guinea','69':'Mali','70':'Venezuela','71':'Ethiopia',
    '72':'Mongolia','73':'Brazil','74':'Afghanistan',
    '75':'Uganda','76':'Angola','77':'Cyprus','78':'France',
    '79':'Papua New Guinea','80':'Mozambique','81':'Nepal',
    '82':'Belgium','83':'Bulgaria','84':'Hungary',
    '85':'Moldova','86':'Italy','87':'Paraguay',
    '88':'Honduras','89':'Tunisia','90':'Nicaragua',
    '91':'Timor','92':'Bolivia','93':'Costa Rica',
    '94':'Guatemala','95':'UAE','96':'Zimbabwe',
    '97':'Puerto Rico','98':'Sudan','99':'Togo',
    '100':'Kuwait','101':'Salvador','102':'Libya',
    '103':'Jamaica','104':'Trinidad and Tobago',
    '105':'Ecuador','106':'Swaziland','107':'Oman',
    '108':'Bosnia','109':'Dominican Republic',
    '110':'Syria','111':'Qatar','112':'Panama',
    '113':'Cuba','114':'Mauritania',
  };
  return names[code] || 'Country '+code;
}

module.exports = router;
