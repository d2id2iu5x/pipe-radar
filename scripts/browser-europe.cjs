/** Real browser regression against the built site and explicit synthetic API fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.QA_PLAYWRIGHT || 'playwright');
async function main() {
  await fs.mkdir('review',{recursive:true});
  const root=path.resolve('dist'), checks=[], errors=[];
  const server=http.createServer(async (req,res)=>{
    try {
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
      const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      const bytes=await fs.readFile(file);
      res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(bytes);
    } catch {res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  let browser,page;
  const now=new Date().toISOString();
  const term={raw:'Nie podano',normalized:null};
  const make=(id,country,rate)=>({id,sourceId:'qa',sourceJobId:id,sourceKind:'employer',url:'https://example.test/job/'+id,sources:[{sourceId:'qa',sourceJobId:id,kind:'employer',url:'https://example.test/job/'+id}],title:'QA Pipefitter '+country,company:'TEST ONLY',country,location:'Test',employmentType:'Rotacja',rotation:{raw:'4/2',normalized:'4/2'},rate:{raw:rate,currency:null,hourlyMin:null,hourlyMax:null,approximate:false},housing:term,travel:term,skills:['izometria'],tags:[],description:'Synthetic browser fixture',publishedAt:now,firstSeenAt:now,lastSeenAt:now,lastVerifiedAt:now,missingSuccessfulScans:0,status:'active',conflicts:[],fit:{base:0,adjustments:[],raw:0,score:0},legacyFit:0});
  const payload={schemaVersion:'2.4',generatedAt:now,lastSuccessfulScanAt:now,status:'partial',sources:[],jobs:[make('qa-no','Norwegia','300 NOK/h'),make('qa-de','Niemcy','350 EUR/h'),make('qa-gb','Wielka Brytania','310 GBP/h'),make('qa-fr','Francja','300 CHF/h')]};
  try {
    browser=await chromium.launch({headless:true});
    page=await browser.newPage({viewport:{width:1280,height:900}});
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://raw.githubusercontent.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)}));
    await page.goto(base,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelectorAll('#grid .card').length===4);
    assert.equal(await page.locator('#country option').count(),53);checks.push('51 country entries plus all-Europe and unknown');
    for(const [country,id] of [['Niemcy','qa-de'],['Wielka Brytania','qa-gb'],['Francja','qa-fr']]) {
      await page.selectOption('#country',country);
      assert.deepEqual(await page.locator('#grid .card').evaluateAll(items=>items.map(i=>i.dataset.jobId)),[id]);
      checks.push('Actual filter: '+country);
    }
    await page.selectOption('#country','Portugalia');
    assert.equal(await page.locator('#grid .card').count(),0);
    assert.match(await page.locator('#europeWeb').getAttribute('href'),/Portugal/);checks.push('Empty country retains a real external search');
    await page.locator('[onclick="resetFilters()"]').click();
    assert.equal(await page.locator('#grid .card').count(),4);checks.push('Reset restores European fixtures');
    await page.locator('[data-quick="300 NOK"]').click();
    assert.deepEqual(await page.locator('#grid .card').evaluateAll(items=>items.map(i=>i.dataset.jobId)),['qa-no']);checks.push('EUR GBP CHF do not match 300 NOK');
    await page.locator('[onclick="resetFilters()"]').click();
    await page.selectOption('#country','Niemcy');
    await page.locator('[data-language="en"]').click();
    await page.waitForFunction(()=>document.querySelector('#country').selectedOptions[0].textContent==='Germany');
    assert.equal(await page.locator('#country').inputValue(),'Niemcy');checks.push('Language switch preserves selected country');
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#country option[value="Niemcy"]').textContent==='Germany');checks.push('English preference survives reload');
    await page.locator('[data-language="pl"]').click();
    await page.waitForFunction(()=>document.querySelector('#country option').textContent==='Cała Europa');
    await page.screenshot({path:'review/europe-desktop.png'});
    await page.setViewportSize({width:375,height:812});
    await page.screenshot({path:'review/europe-mobile.png'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);checks.push('375px mobile without horizontal overflow');
    assert.deepEqual(errors,[]);checks.push('No browser runtime errors');
    await fs.writeFile('review/europe-browser.json',JSON.stringify({success:true,checks,errors,fixtureData:true,browser:browser.version()},null,2));
    console.log('BROWSER CHECKS PASS:',checks.length);
  } catch(error) {
    if(page) await page.screenshot({path:'review/europe-failure.png'}).catch(()=>{});
    await fs.writeFile('review/europe-browser.json',JSON.stringify({success:false,checks,errors,error:String(error),fixtureData:true},null,2));throw error;
  } finally {if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
