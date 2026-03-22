const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const logs = [];
  page.on('pageerror', error => logs.push(`PAGE ERROR: ${error.message}`));
  page.on('console', msg => logs.push(`CONSOLE ${msg.type()}: ${msg.text()}`));
  
  await page.goto('https://eb28.co/alarmclock/');
  await page.waitForTimeout(3000);
  
  console.log("LOGS:", logs.join('\n'));
  
  try {
    const btn = await page.locator('button:has-text("SNOOZE")').first();
    const box = await btn.boundingBox();
    console.log("SNOOZE button box:", box);
    
    // Find what element is at the center of the snooze button
    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      
      const elementHtml = await page.evaluate(({x, y}) => {
        const el = document.elementFromPoint(x, y);
        return el ? el.outerHTML.substring(0, 200) : 'null';
      }, {x, y});
      console.log(`Element at SNOOZE (${x}, ${y}):`);
      console.log(elementHtml);
    }
    
  } catch (err) {
    console.log("Error finding snooze:", err.message);
  }
  
  await browser.close();
})();
