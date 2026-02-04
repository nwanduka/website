// trigger-scan.js
// Simple script to trigger an accessibility scan

const urls = [
  'https://victorianduka.com/',
  'https://victorianduka.com/about/',
  'https://victorianduka.com/works/',
  // Add more URLs as needed
];

async function triggerScan() {
  try {
    const response = await fetch('http://localhost:9091/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls })
    });
    
    const result = await response.json();
    console.log('Scan triggered:', result);
    console.log('\nWait a few moments, then check metrics at:');
    console.log('http://localhost:9091/metrics');
  } catch (error) {
    console.error('Error triggering scan:', error.message);
    console.log('\nMake sure the exporter is running:');
    console.log('node prometheus-exporter.js');
  }
}

triggerScan();
