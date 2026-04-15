const axios = require('axios');

const BASE_URL = 'https://smsbower.app/stubs/handler_api.php';
const API_KEY = process.env.SMSBOWER_API_KEY;
const PROFIT_MARGIN = parseFloat(process.env.PROFIT_MARGIN || 30) / 100;

const smsbower = {
  async getBalance() {
    const res = await axios.get(`${BASE_URL}?api_key=${API_KEY}&action=getBalance`);
    return parseFloat(res.data.split(':')[1]);
  },
  async getServices() {
    const res = await axios.get(`${BASE_URL}?api_key=${API_KEY}&action=getNumbersStatus&country=0`);
    return res.data;
  },
  async getPrices(service) {
    const res = await axios.get(`${BASE_URL}?api_key=${API_KEY}&action=getPrices&service=${service}&country=0`);
    return res.data;
  },
  async getNumber(service, country = '0') {
    const res = await axios.get(`${BASE_URL}?api_key=${API_KEY}&action=getNumber&service=${service}&country=${country}`);
    if (res.data.startsWith('ACCESS_NUMBER')) {
      const parts = res.data.split(':');
      return { activationId: parts[1], phone: parts[2] };
    }
    throw new Error(res.data);
  },
  async getStatus(activationId) {
    const res = await axios.get(`${BASE_URL}?api_key=${API_KEY}&action=getStatus&id=${activationId}`);
    return res.data;
  },
  async setStatus(activationId, status) {
    const res = await axios.get(`${BASE_URL}?api_key=${API_KEY}&action=setStatus&id=${activationId}&status=${status}`);
    return res.data;
  },
  getPriceWithMargin(basePrice) {
    return parseFloat((basePrice * (1 + PROFIT_MARGIN)).toFixed(4));
  }
};

module.exports = smsbower;
