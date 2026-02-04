// grafana-cloud-exporter.js
// Runs axe-core scans and pushes metrics to Grafana Cloud Prometheus

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');

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

// Push metrics to Grafana Cloud Prometheus
async function pushToPrometheus(allMetrics) {
  if (!PROMETHEUS_URL || !PROMETHEUS_USER || !PROMETHEUS_PASSWORD) {
    throw new Error('Missing Grafana Cloud credentials in environment variables');
  }
  
  // Convert metrics to Prometheus remote write format
  const timeseries = [];
  
  allMetrics.forEach(metric => {
    const labels = [
      { name: '__name__', value: metric.name }
    ];
    
    // Add metric labels
    Object.keys(metric.labels).forEach(key => {
      labels.push({ name: key, value: metric.labels[key] });
    });
    
    timeseries.push({
      labels: labels,
      samples: [{
        value: metric.value,
        timestamp: metric.timestamp
      }]
    });
  });
  
  const payload = {
    timeseries: timeseries
  };
  
  // Create basic auth header
  const auth = Buffer.from(`${PROMETHEUS_USER}:${PROMETHEUS_PASSWORD}`).toString('base64');
  
  try {
    const response = await fetch(PROMETHEUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Authorization': `Basic ${auth}`,
        'X-Prometheus-Remote-Write-Version': '0.1.0'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
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
