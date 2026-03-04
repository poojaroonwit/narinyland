const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('requestfailed', request => console.log('REQ FAIL:', request.url(), request.failure()?.errorText));
  
  await page.goto('https://narinyland.up.railway.app/login');
  await new Promise(r => setTimeout(r, 3000));
  
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('Sign In to Continue')) {
      await b.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 10000));
  console.log('FINAL URL:', page.url());
  await browser.close();
})();
