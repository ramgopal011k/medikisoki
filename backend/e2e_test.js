const { chromium } = require('playwright');

(async () => {
  console.log('Starting E2E verification test...');
  const browser = await chromium.launch({ headless: true });
  
  try {
    // ----------------------------------------------------------------
    // TEST 1: FEVER (Should not red-flag)
    // ----------------------------------------------------------------
    console.log('--- TEST 1: FEVER ---');
    let page1 = await browser.newPage();
    await page1.goto('http://localhost:5173');
    
    // Select Language
    await page1.click('text=English');
    await page1.waitForTimeout(500);

    // Select Hospital
    await page1.click('text=City General Hospital');
    await page1.waitForTimeout(500);
    
    // Enter Aadhaar
    await page1.fill('input[placeholder="1234 5678 9012"]', '123412341234');
    await page1.click('text=Continue');
    await page1.waitForTimeout(500);
    
    // Consent
    await page1.click('input[type="checkbox"]');
    await page1.click('text=I understand and agree');
    
    // Wait for Chief Complaint page
    await page1.waitForSelector('text=What brings you here today?');
    
    // Select Fever on Consent Flow
    console.log('Selecting Fever on Consent Flow...');
    await page1.click('text=Fever');

    // Click Start
    console.log('Clicking Start...');
    await page1.click('text=Start');

    // Wait for Chief Complaint page redirect (after 2s success screen)
    await page1.waitForURL('**/chief-complaint', { timeout: 10000 });
    
    // Select Fever on Chief Complaint page
    console.log('Selecting Fever on Chief Complaint...');
    await page1.click('text=Fever');
    
    // Wait for FollowUp page
    await page1.waitForSelector('text=How high is your fever?');
    
    // Answer first question
    console.log('Answering "Low grade"...');
    await page1.click('text=Low grade');
    await page1.waitForTimeout(1000); // Give it a sec to check red-flags
    
    // Check if we got redirected to red-flag
    let currentUrl = page1.url();
    if (currentUrl.includes('/red-flag-alert')) {
      throw new Error('Test 1 FAILED: Fever triggered red-flag lock!');
    }
    
    console.log('Test 1 PASS: Fever did not trigger red flag.');
    await page1.close();

    // ----------------------------------------------------------------
    // TEST 2: CHEST PAIN (Should red-flag on severity)
    // ----------------------------------------------------------------
    console.log('--- TEST 2: CHEST PAIN ---');
    let page2 = await browser.newPage();
    
    // Start fresh - hitting / should clear localStorage due to our fix
    await page2.goto('http://localhost:5173');
    
    // Select Language
    await page2.click('text=English');
    await page2.waitForTimeout(500);

    // Select Hospital
    await page2.click('text=City General Hospital');
    await page2.waitForTimeout(500);
    
    // Enter Aadhaar
    await page2.fill('input[placeholder="1234 5678 9012"]', '999988887777');
    await page2.click('text=Continue');
    await page2.waitForTimeout(500);
    
    // Consent
    await page2.click('input[type="checkbox"]');
    await page2.click('text=I understand and agree');
    
    // Wait for Chief Complaint page
    await page2.waitForSelector('text=What brings you here today?');
    
    // Select Chest pain on Consent Flow
    console.log('Selecting Chest pain on Consent Flow...');
    await page2.click('text=Chest pain');

    // Click Start
    console.log('Clicking Start...');
    await page2.click('text=Start');

    // Wait for Chief Complaint page redirect (after 2s success screen)
    await page2.waitForURL('**/chief-complaint', { timeout: 10000 });

    // Select Chest pain on Chief Complaint page
    console.log('Selecting Chest pain on Chief Complaint...');
    await page2.click('text=Chest pain');
    
    // Wait for FollowUp page
    await page2.waitForSelector('text=How severe is the pain?');
    
    // Answer severity question with Red-Flag answer
    console.log('Answering "7-10 Severe"...');
    await page2.click('text=7-10 Severe');
    
    // It should immediately redirect to /red-flag-alert
    await page2.waitForURL('**/red-flag-alert', { timeout: 3000 });
    
    console.log('Test 2 PASS: Severe Chest Pain correctly triggered red flag.');
    await page2.close();
    
    console.log('ALL TESTS PASSED SUCCESSFULLY.');

  } catch (err) {
    console.error('TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
