// grafana-cloud-exporter.js
// Runs axe-core scans and pushes metrics to Grafana Cloud Prometheus

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const client = require('prom-client');

// Grafana Cloud credentials from environment variables
const PROMETHEUS_URL = process.env.PROMETHEUS_URL;
const PROMETHEUS_USER = process.env.PROMETHEUS_USER;
const PROMETHEUS_PASSWORD = process.env.PROMETHEUS_PASSWORD;

// URLs to scan
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

// Convert scan results to Prometheus metrics format
function formatMetricsForPrometheus(url, results, timestamp) {
  const metrics = [];
  
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
  });
  
  // Create metric samples in Prometheus format
  Object.keys(bySeverity).forEach(severity => {
    metrics.push({
      name: 'accessibility_violations_total',
      labels: {
        url: url,
        severity: severity
      },
      value: bySeverity[severity],
      timestamp: timestamp
    });
  });
  
  // Total passes
  metrics.push({
    name: 'accessibility_passes_total',
    labels: { url: url },
    value: results.passes.length,
    timestamp: timestamp
  });
  
  // Total incomplete
  metrics.push({
    name: 'accessibility_incomplete_total',
    labels: { url: url },
    value: results.incomplete.length,
    timestamp: timestamp
  });
  
  return metrics;
}

// Push metrics to Grafana Cloud Prometheus using prom-client
async function pushToPrometheus(allMetrics) {
  if (!PROMETHEUS_URL || !PROMETHEUS_USER || !PROMETHEUS_PASSWORD) {
    throw new Error('Missing Grafana Cloud credentials in environment variables');
  }
  
  // Create a registry and metrics
  const register = new client.Registry();
  
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
  
  // Set metric values
  allMetrics.forEach(metric => {
    if (metric.name === 'accessibility_violations_total') {
      violationsGauge.labels(metric.labels.url, metric.labels.severity).set(metric.value);
    } else if (metric.name === 'accessibility_passes_total') {
      passesGauge.labels(metric.labels.url).set(metric.value);
    } else if (metric.name === 'accessibility_incomplete_total') {
      incompleteGauge.labels(metric.labels.url).set(metric.value);
    }
  });
  
  // Get metrics in Prometheus exposition format
  const metricsText = await register.metrics();
  
  // Create basic auth header
  const auth = Buffer.from(`${PROMETHEUS_USER}:${PROMETHEUS_PASSWORD}`).toString('base64');
  
  try {
    const response = await fetch(PROMETHEUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Basic ${auth}`
      },
      body: metricsText
    });
    
    if (response.ok || response.status === 204) {
      console.log('✓ Successfully pushed metrics to Grafana Cloud Prometheus');
    } else {
      const error = await response.text();
      console.error('✗ Failed to push metrics:', response.status, error);
    }
  } catch (error) {
    console.error('✗ Error pushing to Prometheus:', error);
    throw error;
  }
}

// Main function
async function main() {
  console.log('Starting accessibility scan...');
  console.log(`Scanning ${URLS.length} URLs`);
  
  const allMetrics = [];
  const timestamp = Date.now();
  
  for (const url of URLS) {
    try {
      const results = await scanWebsite(url);
      const metrics = formatMetricsForPrometheus(url, results, timestamp);
      
      allMetrics.push(...metrics);
      
      console.log(`✓ Scanned ${url}:`);
      console.log(`  Violations: ${results.violations.length}`);
      console.log(`  Passes: ${results.passes.length}`);
    } catch (error) {
      console.error(`✗ Error scanning ${url}:`, error.message);
    }
  }
  
  if (allMetrics.length > 0) {
    console.log(`\nPushing ${allMetrics.length} metrics to Grafana Cloud...`);
    await pushToPrometheus(allMetrics);
  } else {
    console.log('No metrics to push');
  }
  
  console.log('\nScan complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});