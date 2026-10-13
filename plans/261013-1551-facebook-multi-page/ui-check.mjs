import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{if(!localStorage.getItem('socialchoice.language'))localStorage.setItem('socialchoice.language','en');});
await page.goto('http://127.0.0.1:3101/posts');
await page.getByRole('button',{name:'LOCAL TEST Multi-Page Draft',exact:true}).click();
await page.getByRole('link',{name:'Edit post',exact:true}).click();
await page.getByText('Per-Page content and schedule',{exact:true}).waitFor();
await page.getByLabel('Page caption (optional)',{exact:true}).nth(1).fill('Page two caption — local test only');
await page.getByLabel(/Preview Page/).selectOption({label:'LOCAL TEST Page 2'});
await page.getByRole('article').getByText('Page two caption — local test only',{exact:true}).waitFor();
const future=offset=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Date.now()+offset*86400000)).map(part=>[part.type,part.value]));return parts.year+'-'+parts.month+'-'+parts.day;};
await page.getByLabel('Page publishing time (optional)',{exact:true}).nth(1).fill(future(2)+'T10:30');
await page.getByLabel('Date',{exact:true}).fill(future(1));await page.getByLabel('Time',{exact:true}).fill('10:00');
for(const width of [375,768,1440]) {await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'composer overflow '+width);await page.screenshot({path:'plans/261013-1551-facebook-multi-page/composer-'+width+'.png',fullPage:true});}
await page.getByRole('button',{name:'Schedule post',exact:true}).click();
const review=page.getByRole('dialog');await review.getByRole('heading',{name:'Confirm Facebook post',exact:true}).waitFor();assert.equal(await review.locator('section').count(),2);assert.ok((await review.innerText()).includes('Page two caption — local test only'));
for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'review overflow '+width);await page.screenshot({path:'plans/261013-1551-facebook-multi-page/review-'+width+'.png',fullPage:false});}
await review.getByRole('button',{name:'Confirm automatic schedule',exact:true}).click();
const detail=page.getByRole('dialog');await detail.getByRole('heading',{name:'Results by Page',exact:true}).waitFor();await detail.getByRole('button',{name:'Cancel this Page schedule',exact:true}).nth(1).waitFor();
await detail.getByRole('button',{name:'Cancel this Page schedule',exact:true}).nth(0).click();await page.waitForTimeout(300);assert.equal(await detail.getByRole('button',{name:'Cancel this Page schedule',exact:true}).count(),1);
await detail.getByRole('button',{name:'Cancel automatic schedule',exact:true}).click();await page.waitForTimeout(300);await detail.getByRole('link',{name:'Edit post',exact:true}).waitFor();
await page.screenshot({path:'plans/261013-1551-facebook-multi-page/results.png',fullPage:false});
await detail.getByRole('link',{name:'Edit post',exact:true}).click();await page.getByText('Per-Page content and schedule',{exact:true}).waitFor();assert.equal(await page.getByLabel('Page caption (optional)',{exact:true}).nth(1).inputValue(),'Page two caption — local test only');
await page.evaluate(()=>localStorage.setItem('socialchoice.language','vi'));await page.reload();await page.getByText('Nội dung và lịch riêng từng Page',{exact:true}).waitFor();await page.setViewportSize({width:375,height:900});await page.screenshot({path:'plans/261013-1551-facebook-multi-page/composer-vi-mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log('Composer/Page preview, exact group review, scheduled confirmation, individual/all cancellation, persisted caption, EN/VI and widths375/768/1440 passed. No delivery alarm or Facebook write.');
} catch(error) {console.log(await browser.contexts()[0].pages()[0].locator('body').innerText());await browser.contexts()[0].pages()[0].screenshot({path:'plans/261013-1551-facebook-multi-page/ui-failure.png',fullPage:true});throw error;} finally {await browser.close();}
