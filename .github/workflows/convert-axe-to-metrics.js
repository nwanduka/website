// convert-axe-to-metrics.js
const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('axe-output/axe-report.json', 'utf-8'));
const metrics = [];

// Count violations per page
raw.violations.forEach(v => {
  const page = v.nodes[0]?.target[0] || 'unknown';
  metrics.push({
    eventType: 'violation',
    page,
    count: v.nodes.length // each node = one violation instance
  });
});

// Write metrics to file for sending
fs.writeFileSync('axe-output/metrics.json', JSON.stringify(metrics, null, 2));
console.log('Converted axe-core report to Alloy metrics format');