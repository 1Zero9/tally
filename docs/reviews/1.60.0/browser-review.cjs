/* eslint-disable @typescript-eslint/no-require-imports */
// Run with PLAYWRIGHT_PATH pointing at an installed playwright package. All browser API calls are intercepted.
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');const path=require('node:path');
const out=__dirname; const base='http://localhost:3199';
const user={id:'review',name:'Review Person',email:'review@example.invalid',role:'ADMIN',householdId:'review-house'};
const expenses=Array.from({length:24},(_,i)=>({id:`e${i}`,name:i===0?'Review subscription':'Household item '+i,amount:10+i,currency:'EUR',billingCycle:'monthly',category:'entertainment',icon:'Tv',color:'#256B4F',renewalDay:15,nextRenewalDate:'2026-09-15',isActive:true,isPaidThisCycle:false,isPending:false,isBill:true,paymentMethod:'Direct Debit',usageRating:'high',createdAt:'2026-09-01T12:00:00Z',updatedAt:'2026-09-01T12:00:00Z'}));
const results=[];
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});
for(const width of [1440,768,390,320]){
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>r.fulfill({status:200,json:{status:'anonymous'}}));
 await page.goto(base);await page.getByPlaceholder('name@example.com').waitFor();
 results.push({width,screen:'login',...(await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,inputs:[...document.querySelectorAll('input')].map(e=>({type:e.type,labels:e.labels.length,ariaLabel:e.getAttribute('aria-label')}))})))});
 await page.screenshot({animations:'disabled',path:path.join(out,`login-${width}.png`)});
 await page.unroute('**/api/**');
 await page.route('**/api/**',async r=>{
  const p=new URL(r.request().url()).pathname;
  if(r.request().method()!=='GET')return r.fulfill({status:500,json:{status:'error',message:'Synthetic save failure'}});
  const fixtures={'/api/auth/me':{status:'authenticated',user},'/api/users':{users:[user]},'/api/expenses':{expenses},'/api/income':{incomes:[]},'/api/accounts':{accounts:[],encryptionConfigured:true},'/api/transfers':{transfers:[]},'/api/goals':{goals:[]},'/api/categories':{categories:[]},'/api/budgets':{budgets:[]},'/api/statements':{imports:[]},'/api/history':{history:[]},'/api/map':{nodes:[],edges:[]}};
  return r.fulfill({json:{status:'ok',...fixtures[p]}});
 });
 await page.reload();await page.locator('.ha-greeting').waitFor();await page.waitForTimeout(350);
 const screens=['Overview','Spending','Bills','Income','Accounts','Insights','Reports','Flow','Goals','Planned','Money Map'];
 for(const screen of screens){
  if(width<=900){await page.getByTitle('Menu',{exact:true}).click();await page.locator('.mobile-drawer').getByRole('button',{name:screen,exact:true}).click();}
  else await page.locator('nav[aria-label="Main navigation"]').getByRole('button',{name:screen,exact:true}).click();
  await page.waitForTimeout(80);
  results.push({width,screen,...(await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,scrollWidth:document.documentElement.scrollWidth,unnamedButtons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width&&!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.title).length}))),errors:[...errors]});
  if(screen==='Spending' && width===1440){await page.getByTitle('Unpaid — click to mark paid').first().click();await page.waitForTimeout(100);results.push({screen:'failed-paid-save',remainsPaidAfter500:await page.getByTitle('Paid — click to mark unpaid').count(),visibleError:await page.getByText('Synthetic save failure').count()});}
  if(['Overview','Spending','Reports'].includes(screen))await page.screenshot({animations:'disabled',path:path.join(out,`${screen.toLowerCase()}-${width}.png`)});
 }
 await page.getByRole('button',{name:'Add expense',exact:true}).filter({visible:true}).click();await page.locator('.modal-overlay').waitFor();
 results.push({width,screen:'expense-form',...(await page.evaluate(()=>({dialogs:document.querySelectorAll('[role="dialog"],dialog').length,unlabelledFields:[...document.querySelectorAll('.modal-overlay input,.modal-overlay select,.modal-overlay textarea')].filter(e=>!e.labels.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).length,focusInside:!!document.activeElement.closest('.modal-overlay')})))});
 await page.screenshot({animations:'disabled',path:path.join(out,`expense-form-${width}.png`)});
 let focusEscaped=false;for(let i=0;i<35;i++){await page.keyboard.press('Tab');if(!await page.evaluate(()=>!!document.activeElement.closest('.modal-overlay')))focusEscaped=true;}results.push({width,screen:'modal-keyboard',focusEscaped});
 await page.close();
}
await browser.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exit(1)});
