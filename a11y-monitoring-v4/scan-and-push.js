// scan-and-push.js
// Scans website with axe-core and pushes metrics to Grafana Cloud Prometheus

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const client = require('prom-client');

// Grafana Cloud Prometheus credentials
const PROMETHEUS_URL = process.env.PROMETHEUS_URL;
const PROMETHEUS_USER = process.env.PROMETHEUS_USER;
const PROMETHEUS_PASSWORD = process.env.PROMETHEUS_PASSWORD;

const URLS = [
  'https://victorianduka.com/',
  'https://victorianduka.com/about/',
  'https://victorianduka.com/works/',
];

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

// Push metrics directly to Grafana Cloud using text format
async function pushToGrafanaCloud(allResults) {
  if (!PROMETHEUS_URL || !PROMETHEUS_USER || !PROMETHEUS_PASSWORD) {
    throw new Error('Missing Grafana Cloud credentials');
  }
  
  // Create registry and metrics
  const register = new client.Registry();
  
  const violationsGauge = new client.Gauge({
    name: 'accessibility_violations_total',
    help: 'Total accessibility violations',
    labelNames: ['url', 'severity'],
    registers: [register]
  });
  
  const passesGauge = new client.Gauge({
    name: 'accessibility_passes_total',
    help: 'Total accessibility passes',
    labelNames: ['url'],
    registers: [register]
  });
  
  const incompleteGauge = new client.Gauge({
    name: 'accessibility_incomplete_total',
    help: 'Total incomplete checks',
    labelNames: ['url'],
    registers: [register]
  });
  
  // Set metric values
  allResults.forEach(({ url, results }) => {
    const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    
    results.violations.forEach(violation => {
      const severity = violation.impact || 'unknown';
      bySeverity[severity] = (bySeverity[severity] || 0) + violation.nodes.length;
    });
    
    Object.keys(bySeverity).forEach(severity => {
      violationsGauge.labels(url, severity).set(bySeverity[severity]);
    });
    
    passesGauge.labels(url).set(results.passes.length);
    incompleteGauge.labels(url).set(results.incomplete.length);
  });
  
  // Get metrics in Prometheus text format
  const metrics = await register.metrics();
  
  // Try to push to Grafana Cloud's write endpoint
  // Use /api/v1/write which accepts text format (not remote write)
  const writeUrl = PROMETHEUS_URL.replace('/api/prom/push', '/api/v1/write');
  
  console.log(`Pushing to Grafana Cloud...`);
  
  const auth = Buffer.from(`${PROMETHEUS_USER}:${PROMETHEUS_PASSWORD}`).toString('base64');
  
  try {
    const response = await fetch(writeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Basic ${auth}`
      },
      body: metrics
    });
    
    if (response.ok || response.status === 204) {
      console.log('✓ Successfully pushed metrics to Grafana Cloud');
    } else {
      const error = await response.text();
      console.error('✗ Failed:', response.status, error);
      throw new Error(`Push failed: ${response.status}`);
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    throw error;
  }
}

// Main
async function main() {
  console.log('Starting accessibility scan...');
  
  const allResults = [];
  
  for (const url of URLS) {
    try {
      const results = await scanWebsite(url);
      allResults.push({ url, results });
      console.log(`✓ ${url}: ${results.violations.length} violations, ${results.passes.length} passes`);
    } catch (error) {
      console.error(`✗ Error scanning ${url}:`, error.message);
    }
  }
  
  if (allResults.length > 0) {
    await pushToGrafanaCloud(allResults);
  }
  
  console.log('Scan complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});