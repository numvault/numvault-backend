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
  return await r.text();
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
    res.json({ activation_id: activationId, phone, cost: cost.toFixed(2), new_balance: (balance - cost).toFixed(2) });
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
    'tg':'Telegram','wa':'WhatsApp','vk':'VK','vi':'Viber',
    'fb':'Facebook','ig':'Instagram','tw':'Twitter/X','go':'Google',
    'yt':'YouTube','am':'Amazon','ap':'Apple','ms':'Microsoft',
    'nf':'Netflix','sp':'Spotify','tt':'TikTok','li':'LinkedIn',
    'dc':'Discord','ub':'Uber','ok':'OK.ru','sk':'Skype',
    'wc':'WeChat','sn':'Snapchat','rd':'Reddit','pp':'PayPal',
    'ln':'Line','kk':'KakaoTalk','zl':'Zalo','im':'IMO',
    'sg':'Signal','bm':'Bumble','td':'Tinder','bd':'Badoo',
    'st':'Steam','tx':'Twitch','gh':'GitHub','bn':'Binance',
    'cb':'Coinbase','by':'Bybit','dh':'DoorDash','lf':'Lyft',
    'pt':'Pinterest','hw':'Hulu','ds':'Duolingo','zo':'Zoom',
  };
  return names[code] || code.toUpperCase();
}

function getCountryName(code) {
  const names = {
    'ru':'Russia','ua':'Ukraine','kz':'Kazakhstan','cn':'China',
    'ph':'Philippines','mm':'Myanmar','id':'Indonesia','my':'Malaysia',
    'ke':'Kenya','tz':'Tanzania','vn':'Vietnam','kg':'Kyrgyzstan',
    'us':'USA','il':'Israel','hk':'Hong Kong','pl':'Poland',
    'gb':'England','ng':'Nigeria','eg':'Egypt','in':'India',
    'kh':'Cambodia','co':'Colombia','ee':'Estonia','az':'Azerbaijan',
    'ca':'Canada','ma':'Morocco','gh':'Ghana','ar':'Argentina',
    'uz':'Uzbekistan','cm':'Cameroon','de':'Germany','lt':'Lithuania',
    'hr':'Croatia','se':'Sweden','iq':'Iraq','nl':'Netherlands',
    'lv':'Latvia','at':'Austria','by':'Belarus','th':'Thailand',
    'sa':'Saudi Arabia','mx':'Mexico','tw':'Taiwan','es':'Spain',
    'ir':'Iran','dz':'Algeria','bd':'Bangladesh','tr':'Turkey',
    'cz':'Czech Republic','lk':'Sri Lanka','pe':'Peru','pk':'Pakistan',
    'br':'Brazil','af':'Afghanistan','ug':'Uganda','fr':'France',
    'np':'Nepal','be':'Belgium','bg':'Bulgaria','hu':'Hungary',
    'md':'Moldova','it':'Italy','ae':'UAE','zw':'Zimbabwe',
    'kw':'Kuwait','sy':'Syria','qa':'Qatar','pa':'Panama',
    'cu':'Cuba','do':'Dominican Republic','ec':'Ecuador',
    'bo':'Bolivia','cr':'Costa Rica','gt':'Guatemala',
    'hn':'Honduras','py':'Paraguay','uy':'Uruguay','ve':'Venezuela',
    'et':'Ethiopia','mn':'Mongolia','ao':'Angola','cy':'Cyprus',
    'fr':'France','pt':'Portugal','gr':'Greece','fi':'Finland',
    'no':'Norway','dk':'Denmark','ch':'Switzerland','nz':'New Zealand',
    'au':'Australia','jp':'Japan','kr':'South Korea','sg':'Singapore',
    'any':'Any Country',
  };
  return names[code] || code.toUpperCase();
}

module.exports = router;
