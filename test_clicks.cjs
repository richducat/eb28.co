const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', error => console.error(`PAGE ERROR: ${error.message}`));
  page.on('console', msg => console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`));
  
  await page.goto('https://eb28.co/alarmclock/');
  await page.waitForTimeout(3000);
  
  try {
    console.log("Locating SNOOZE button...");
    const snoozeBtn = await page.locator("text=SNOOZE / LIGHT").first();
    await snoozeBtn.click({ timeout: 2000 });
    console.log("Clicked snooze.");
    
    console.log("Clicking Settings gear...");
    await page.locator('button:has(svg.lucide-settings)').first().click({ timeout: 2000 });
    console.log("Clicked settings. Waiting 1s");
    await page.waitForTimeout(1000);
  } catch (err) {
    console.error("Test failed:", err.message);
  }
  
  await browser.close();
})();
