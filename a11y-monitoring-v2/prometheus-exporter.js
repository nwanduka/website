// prometheus-exporter.js
// Runs axe-core scans and exposes metrics for Prometheus to scrape

const express = require('express');
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 9091;

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (optional - shows node.js metrics)
client.collectDefaultMetrics({ register });

// Define custom metrics for accessibility
const violationsGauge = new client.Gauge({
  name: 'accessibility_violations_total',
  help: 'Total number of accessibility violations',
  labelNames: ['url', 'severity'],
  registers: [register]
});

const passesGauge = new client.Gauge({
  name: 'accessibility_passes_total',
  help: 'Total number of accessibility checks passed',
  labelNames: ['url'],
  registers: [register]
});

const incompleteGauge = new client.Gauge({
  name: 'accessibility_incomplete_total',
  help: 'Total number of incomplete accessibility checks',
  labelNames: ['url'],
  registers: [register]
});

const violationsByTypeCounter = new client.Gauge({
  name: 'accessibility_violations_by_type',
  help: 'Number of violations by type',
  labelNames: ['url', 'violation_id', 'impact'],
  registers: [register]
});

// Store latest scan results in memory
let latestScanResults = {};
let lastScanTime = null;

// Scan a website with axe-core
async function scanWebsite(url) {
  console.log(`Scanning ${url}...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const results = await new AxePuppeteer(page).analyze();
    
    return results;
  } finally {
    await browser.close();
  }
}

// Update Prometheus metrics from scan results
function updateMetrics(url, results) {
  // Note: We don't clear metrics, we just overwrite them with new values
  
  // Count violations by severity
  const bySeverity = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  };
  
  results.violations.forEach(violation => {
    const severity = violation.impact || 'unknown';
    bySeverity[severity] = (bySeverity[severity] || 0) + violation.nodes.length;
    
    // Track each violation type
    violationsByTypeCounter.labels(url, violation.id, severity).set(violation.nodes.length);
  });
  
  // Set metrics
  Object.keys(bySeverity).forEach(severity => {
    violationsGauge.labels(url, severity).set(bySeverity[severity]);
  });
  
  passesGauge.labels(url).set(results.passes.length);
  incompleteGauge.labels(url).set(results.incomplete.length);
  
  console.log(`Updated metrics for ${url}:`);
  console.log(`  Violations: ${results.violations.length} (${JSON.stringify(bySeverity)})`);
  console.log(`  Passes: ${results.passes.length}`);
  console.log(`  Incomplete: ${results.incomplete.length}`);
}

// Scan multiple URLs
async function scanAllUrls(urls) {
  console.log(`Starting scan of ${urls.length} URLs...`);
  
  for (const url of urls) {
    try {
      const results = await scanWebsite(url);
      updateMetrics(url, results);
      latestScanResults[url] = results;
    } catch (error) {
      console.error(`Error scanning ${url}:`, error.message);
    }
  }
  
  lastScanTime = new Date();
  console.log(`Scan completed at ${lastScanTime.toISOString()}`);
}

// API endpoint to trigger a scan
app.post('/scan', express.json(), async (req, res) => {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ 
      error: 'Please provide an array of URLs to scan',
      example: { urls: ['https://example.com', 'https://example.com/about'] }
    });
  }
  
  // Start scan in background
  scanAllUrls(urls).catch(err => {
    console.error('Scan error:', err);
  });
  
  res.json({ 
    message: 'Scan started',
    urls: urls,
    note: 'Metrics will be available at /metrics once scan completes'
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    lastScanTime: lastScanTime,
    scannedUrls: Object.keys(latestScanResults),
    metricsEndpoint: '/metrics',
    scanEndpoint: '/scan (POST)'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Prometheus exporter running on http://localhost:${PORT}`);
  console.log(`Metrics available at: http://localhost:${PORT}/metrics`);
  console.log(`Trigger scan: POST to http://localhost:${PORT}/scan with body: { "urls": ["https://example.com"] }`);
  console.log(`Status: http://localhost:${PORT}/status`);
});