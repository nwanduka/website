// convert-axe-to-metrics.js
// Converts axe JSON report into events for Alloy server

const fs = require('fs');
const path = require('path');

// Path to axe JSON report
const reportPath = path.join(__dirname, 'axe-output', 'axe-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('Axe report not found at', reportPath);
  process.exit(1);
}

const raw = fs.readFileSync(reportPath, 'utf-8');
const report = JSON.parse(raw);

// Array to store metric events
const events = [];

// Convert each violation into a Prometheus-friendly event
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

// Optional: Save converted events to JSON for debugging / audit
const outputDir = path.join(__dirname, 'axe-output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const metricsPath = path.join(outputDir, 'axe-metrics.json');
fs.writeFileSync(metricsPath, JSON.stringify(events, null, 2));

console.log(`[convert-axe-to-metrics] Converted ${events.length} violations to metrics at ${metricsPath}`);