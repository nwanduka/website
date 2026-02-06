// scan-and-push.js
// Automated accessibility scan with axe-core, pushes metrics to Alloy/Grafana Cloud

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const fetch = require('node-fetch');

// Alloy URL from environment variable (Grafana Cloud)
const ALLOY_URL = process.env.ALLOY_URL;
if (!ALLOY_URL) {
  console.error('Error: ALLOY_URL environment variable is not set.');
  process.exit(1);
}

// URLs to scan
const URLS = [
  'https://victorianduka.com/',
  'https://victorianduka.com/about/',
  'https://victorianduka.com/works/',
];

// Scan a single website
async function scanWebsite(url) {
  console.log(`Scanning ${url}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    const results = await new AxePuppeteer(page).analyze();
    return results;
  } finally {
    await browser.close();
  }
}

// Convert scan results into Prometheus metrics
function formatMetricsForPrometheus(allResults) {
  const timestamp = Date.now();
  let metricsText = '';

  allResults.forEach(({ url, results }) => {
    const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };

    results.violations.forEach((v) => {
      const severity = v.impact || 'unknown';
      bySeverity[severity] = (bySeverity[severity] || 0) + v.nodes.length;
    });

    Object.keys(bySeverity).forEach((severity) => {
      metricsText += `accessibility_violations_total{url="${url}",severity="${severity}"} ${bySeverity[severity]} ${timestamp}\n`;
    });

    metricsText += `accessibility_passes_total{url="${url}"} ${results.passes.length} ${timestamp}\n`;
    metricsText += `accessibility_incomplete_total{url="${url}"} ${results.incomplete.length} ${timestamp}\n`;
  });

  return metricsText;
}

// Push metrics to Alloy
async function pushToAlloy(metricsText) {
  try {
    const response = await fetch(ALLOY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: metricsText,
    });

    if (response.ok || response.status === 204) {
      console.log('✓ Successfully pushed metrics to Alloy');
    } else {
      const errText = await response.text();
      console.error('✗ Failed to push metrics:', response.status, errText);
    }
  } catch (err) {
    console.error('✗ Error pushing to Alloy:', err);
    throw err;
  }
}

// Main workflow
(async () => {
  console.log(`Starting accessibility scan for ${URLS.length} pages...`);
  const allResults = [];

  for (const url of URLS) {
    try {
      const results = await scanWebsite(url);
      allResults.push({ url, results });

      console.log(`✓ Scanned ${url}: Violations: ${results.violations.length}, Passes: ${results.passes.length}`);
    } catch (err) {
      console.error(`✗ Error scanning ${url}: ${err.message}`);
    }
  }

  if (allResults.length) {
    console.log('Formatting metrics...');
    const metricsText = formatMetricsForPrometheus(allResults);

    console.log(`Pushing metrics to Alloy at ${ALLOY_URL}...`);
    await pushToAlloy(metricsText);
  } else {
    console.log('No results to push');
  }

  console.log('Accessibility scan complete!');
})();