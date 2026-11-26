const {chromium,devices}=require('playwright-core');
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const origin='https://spawt.online',expected='b6a092e3935835de1f6a0b6384c953d96b0f37ed15eaeb5ba842527a95e63a90';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});try{
 const c=await b.newContext({...devices['Pixel 7'],acceptDownloads:true,serviceWorkers:'block'});const blocked=[];
 await c.route('**/*',r=>{const q=r.request();if(!['GET','HEAD','OPTIONS'].includes(q.method())||q.url().includes('/android-releases/latest.json')){blocked.push(new URL(q.url()).pathname);return r.abort();}return r.continue()});
 const page=await c.newPage();page.on('request',rq=>{if(rq.url().endsWith('.apk'))console.log('APK GET',rq.url())});
 const result=await page.goto(origin+'/',{waitUntil:'domcontentloaded'});assert.equal(result.status(),200);
 const anchor=page.locator('#telecharger a[download]').first();await anchor.waitFor();const href=await anchor.getAttribute('href'),filename=await anchor.getAttribute('download');
 assert.equal(filename,'spawt-1.1.4-build45.apk');assert.equal(href,'/downloads/'+filename);
 const label=(await anchor.locator('..').innerText()).trim();console.log('Ready first click',label);
 const [download]=await Promise.all([page.waitForEvent('download',{timeout:120000}),anchor.click()]);const clickedURL=download.url();assert.equal(clickedURL,origin+href);
 console.log('Downloading',clickedURL,download.suggestedFilename());assert.equal(download.suggestedFilename(),filename);assert.equal(await download.failure(),null);
 const f=await download.path();const h=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(f))h.update(chunk);
 const bytes=fs.statSync(f).size,sha256=h.digest('hex');console.log('Downloaded',sha256,bytes);
 const receipt={utc:new Date().toISOString(),scope:'public first click #telecharger via Android-UA Chrome desktop, manifest intentionally blocked',commit:'fec10b1180e411e30650ddaae2ecda2d232aeffb',label,href:clickedURL,filename,bytes,sha256,networkPostsSent:0,blocked:[...new Set(blocked)]};fs.writeFileSync(process.argv[2],JSON.stringify(receipt,null,2)+'\n');
 assert.equal(bytes,162850779);assert.equal(sha256,expected);
}finally{await b.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
