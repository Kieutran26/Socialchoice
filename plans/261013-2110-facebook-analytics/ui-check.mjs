import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/MECHREVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('socialchoice.language'))localStorage.setItem('socialchoice.language','en');});
 await page.goto('http://127.0.0.1:3101/analytics');
 const panel=page.getByRole('region',{name:'Facebook post performance',exact:true});await panel.getByText('LOCAL TEST Synthetic publication 0',{exact:true}).waitFor();
 
 await panel.getByRole('heading',{name:'Page performance',exact:true}).waitFor();
 for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'analytics overflow '+width);await page.screenshot({path:'plans/261013-2110-facebook-analytics/analytics-'+width+'.png',fullPage:true});}
 await panel.getByLabel('Pillar',{exact:true}).selectOption({label:'Education'});await panel.getByText('1 of 1 publications measured',{exact:true}).first().waitFor();assert.equal(await panel.getByText('LOCAL TEST Synthetic publication 1',{exact:true}).count(),0);
 await panel.getByLabel('Pillar',{exact:true}).selectOption('');await panel.getByText('LOCAL TEST Synthetic publication 1',{exact:true}).waitFor();
 await panel.getByRole('button',{name:'Refresh next 3 publications',exact:true}).click();await panel.getByText('Check Facebook permissions',{exact:true}).first().waitFor();await panel.getByText('Previous data',{exact:true}).first().waitFor();assert.ok(await panel.getByRole('button',{name:'Refresh next 3 publications',exact:true}).isDisabled());
 await page.screenshot({path:'plans/261013-2110-facebook-analytics/analytics-retained-error.png',fullPage:true});
 await panel.getByLabel('Published from',{exact:true}).fill('2027-01-01');await panel.getByRole('alert').waitFor();assert.equal(await panel.getByText('LOCAL TEST Synthetic publication 0',{exact:true}).count(),0);
 await page.setViewportSize({width:1440,height:1000});
 await page.getByLabel('Select brand',{exact:true}).selectOption({label:'LOCAL TEST — Empty brand'});await page.getByRole('heading',{name:'No confirmed Facebook publications in this range',exact:true}).waitFor();assert.equal(await page.getByText('LOCAL TEST Synthetic publication 0',{exact:true}).count(),0);
 await page.getByLabel('Select brand',{exact:true}).selectOption('all');await page.getByText('LOCAL TEST Synthetic publication 0',{exact:true}).waitFor();
 await page.evaluate(()=>localStorage.setItem('socialchoice.language','vi'));await page.reload();await page.getByRole('heading',{name:'Hiệu quả bài đăng Facebook',exact:true}).waitFor();await page.setViewportSize({width:375,height:900});await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'VI mobile overflow');await page.screenshot({path:'plans/261013-2110-facebook-analytics/analytics-vi-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('Analytics/Page/Pillar comparisons, scoped filters, invalid date error, retained data on preflight denial, cooldown, EN/VI and375/768/1440 passed. Synthetic memory fixture only; no Graph request/publication.');
}finally{await browser.close();}
