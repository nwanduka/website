// grafana-cloud-push.js
// Runs axe-core scans and properly pushes to Grafana Cloud Prometheus using Alloy

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');

// Grafana Cloud credentials from environment variables
const ALLOY_URL = process.env.ALLOY_URL || 'http://localhost:9091';

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

// Convert scan results to Prometheus text format
function formatMetricsForPrometheus(allResults) {
  let metricsText = '';
  const timestamp = Date.now();
  
  allResults.forEach(({ url, results }) => {
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
    
    // Format as Prometheus metrics
    Object.keys(bySeverity).forEach(severity => {
      metricsText += `accessibility_violations_total{url="${url}",severity="${severity}"} ${bySeverity[severity]} ${timestamp}\n`;
    });
    
    metricsText += `accessibility_passes_total{url="${url}"} ${results.passes.length} ${timestamp}\n`;
    metricsText += `accessibility_incomplete_total{url="${url}"} ${results.incomplete.length} ${timestamp}\n`;
  });
  
  return metricsText;
}

// Push metrics to Alloy (which forwards to Grafana Cloud)
async function pushToAlloy(metricsText) {
  try {
    const response = await fetch(ALLOY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: metricsText
    });
    
    if (response.ok || response.status === 204) {
      console.log('✓ Successfully pushed metrics to Alloy');
    } else {
      const error = await response.text();
      console.error('✗ Failed to push metrics:', response.status, error);
    }
  } catch (error) {
    console.error('✗ Error pushing to Alloy:', error);
    throw error;
  }
}

// Main function
async function main() {
  console.log('Starting accessibility scan...');
  console.log(`Scanning ${URLS.length} URLs`);
  
  const allResults = [];
  
  for (const url of URLS) {
    try {
      const results = await scanWebsite(url);
      allResults.push({ url, results });
      
      console.log(`✓ Scanned ${url}:`);
      console.log(`  Violations: ${results.violations.length}`);
      console.log(`  Passes: ${results.passes.length}`);
    } catch (error) {
      console.error(`✗ Error scanning ${url}:`, error.message);
    }
  }
  
  if (allResults.length > 0) {
    console.log(`\nFormatting metrics...`);
    const metricsText = formatMetricsForPrometheus(allResults);
    
    console.log(`Pushing metrics to Alloy at ${ALLOY_URL}...`);
    await pushToAlloy(metricsText);
  } else {
    console.log('No results to push');
  }
  
  console.log('\nScan complete!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
