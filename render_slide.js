const path = require('path');
const { chromium } = require('./backend/node_modules/playwright');

(async () => {
  console.log('Launching browser to capture high-res presentation slide...');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2 // 2x crisp retina resolution (3840x2160 pixels!)
  });

  const filePath = 'file:///' + path.resolve(__dirname, 'medikiosk_technical_approach.html').replace(/\\/g, '/');
  console.log('Loading file:', filePath);

  await page.goto(filePath, { waitUntil: 'networkidle' });

  // Wait a moment for web fonts to settle
  await page.waitForTimeout(1000);

  const outputPath = path.resolve(__dirname, 'medikiosk_technical_approach.png');
  await page.screenshot({
    path: outputPath,
    clip: { x: 0, y: 0, width: 1920, height: 1080 }
  });

  console.log('Slide successfully saved to:', outputPath);
  await browser.close();
})();
