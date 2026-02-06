// send-axe-metrics.js
// Reads axe JSON report and sends metrics to Alloy

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Alloy URL from environment variable
const ALLOY_URL = process.env.ALLOY_URL;

if (!ALLOY_URL) {
  console.error('ALLOY_URL environment variable not set');
  process.exit(1);
}

// Path to axe JSON report
const reportPath = path.join(__dirname, 'axe-output', 'axe-report.json');

if (!fs.existsSync(reportPath)) {
  console.error('Axe report not found at', reportPath);
  process.exit(1);
}

const raw = fs.readFileSync(reportPath);
const report = JSON.parse(raw);

// Convert axe results into simple metric events
const events = [];

report.violations.forEach(v => {
  events.push({
    eventType: 'axe_violation',
    rule: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    url: v.url || '/',
    timestamp: new Date().toISOString()
  });
});

// Post events to Alloy
async function sendToAlloy() {
  try {
    const res = await axios.post(ALLOY_URL, {
      sessionId: 'github-workflow',
      events
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[send-axe-metrics] Sent ${events.length} events to Alloy:`, res.status);
  } catch (err) {
    console.error('[send-axe-metrics] Failed to send events to Alloy', err);
    process.exit(1);
  }
}

sendToAlloy();