// send-axe-metrics.js
const fs = require('fs');
const axios = require('axios');

const ALLOY_URL = process.env.ALLOY_URL; // e.g., https://your-alloy-url.onrender.com/axe
if (!ALLOY_URL) throw new Error('ALLOY_URL environment variable not set');

const metrics = JSON.parse(fs.readFileSync('axe-output/metrics.json', 'utf-8'));

axios.post(ALLOY_URL, { metrics })
  .then(() => console.log(`Sent ${metrics.length} metrics to Alloy`))
  .catch(err => console.error('Failed to send metrics to Alloy:', err));