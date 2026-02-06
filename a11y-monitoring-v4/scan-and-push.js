// scan-and-push.js
// Scans website with axe-core and pushes metrics to Alloy

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');

const ALLOY_URL = process.env.ALLOY_URL;

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

// Format results as Prometheus metrics
function formatAsPrometheusMetrics(allResults) {
  let metrics = '';
  const timestamp = Date.now();
  
  allResults.forEach(({ url, results }) => {
    // Count violations by severity
    const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    
    results.violations.forEach(violation => {
      const severity = violation.impact || 'unknown';
      bySeverity[severity] = (bySeverity[severity] || 0) + violation.nodes.length;
    });
    
    // Generate metrics
    Object.keys(bySeverity).forEach(severity => {
      metrics += `accessibility_violations_total{url="${url}",severity="${severity}"} ${bySeverity[severity]} ${timestamp}\n`;
    });
    
    metrics += `accessibility_passes_total{url="${url}"} ${results.passes.length} ${timestamp}\n`;
    metrics += `accessibility_incomplete_total{url="${url}"} ${results.incomplete.length} ${timestamp}\n`;
  });
  
  return metrics;
}

// Push to Alloy
async function pushToAlloy(metrics) {
  if (!ALLOY_URL) {
    throw new Error('ALLOY_URL environment variable not set');
  }
  
  console.log(`Pushing to Alloy at ${ALLOY_URL}...`);
  
  try {
    const response = await fetch(ALLOY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: metrics
    });
    
    if (response.ok || response.status === 204) {
      console.log('✓ Successfully pushed metrics to Alloy');
    } else {
      const error = await response.text();
      console.error('✗ Failed:', response.status, error);
      throw new Error(`Push failed: ${response.status}`);
    }
  } catch (error) {
    console.error('✗ Error pushing to Alloy:', error);
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
    const metrics = formatAsPrometheusMetrics(allResults);
    await pushToAlloy(metrics);
  }
  
  console.log('Scan complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
