// scan-and-push.js
// Scans website with axe-core and pushes metrics to Grafana Cloud Graphite

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');

// Grafana Cloud Graphite credentials
const GRAPHITE_URL = process.env.GRAPHITE_URL;
const GRAPHITE_USER = process.env.GRAPHITE_USER;
const GRAPHITE_PASSWORD = process.env.GRAPHITE_PASSWORD;

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

// Format metrics for Graphite (simple text format)
function formatForGraphite(allResults) {
  const metrics = [];
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  
  allResults.forEach(({ url, results }) => {
    // Sanitize URL for metric name (replace special chars with underscores)
    const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Count violations by severity
    const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    
    results.violations.forEach(violation => {
      const severity = violation.impact || 'unknown';
      bySeverity[severity] = (bySeverity[severity] || 0) + violation.nodes.length;
    });
    
    // Create Graphite metrics: metric.path value timestamp
    Object.keys(bySeverity).forEach(severity => {
      metrics.push(`accessibility.violations.${sanitizedUrl}.${severity} ${bySeverity[severity]} ${timestamp}`);
    });
    
    metrics.push(`accessibility.passes.${sanitizedUrl} ${results.passes.length} ${timestamp}`);
    metrics.push(`accessibility.incomplete.${sanitizedUrl} ${results.incomplete.length} ${timestamp}`);
    
    // Total violations
    const totalViolations = results.violations.length;
    metrics.push(`accessibility.total_violations.${sanitizedUrl} ${totalViolations} ${timestamp}`);
  });
  
  return metrics.join('\n');
}

// Push to Graphite
async function pushToGraphite(metricsText) {
  if (!GRAPHITE_URL || !GRAPHITE_USER || !GRAPHITE_PASSWORD) {
    throw new Error('Missing Graphite credentials');
  }
  
  console.log(`Pushing to Graphite at ${GRAPHITE_URL}...`);
  
  // Graphite uses Basic auth with user:apikey format
  const auth = Buffer.from(`${GRAPHITE_USER}:${GRAPHITE_PASSWORD}`).toString('base64');
  
  try {
    const response = await fetch(GRAPHITE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Basic ${auth}`
      },
      body: metricsText
    });
    
    if (response.ok || response.status === 204 || response.status === 200) {
      console.log('✓ Successfully pushed metrics to Graphite');
      return true;
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
    const metricsText = formatForGraphite(allResults);
    console.log('\nMetrics to send:');
    console.log(metricsText);
    console.log('');
    
    await pushToGraphite(metricsText);
  }
  
  console.log('Scan complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});