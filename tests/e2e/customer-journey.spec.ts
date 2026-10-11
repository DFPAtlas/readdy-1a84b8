import { test, expect, type Page } from '@playwright/test';

const id = '10000000-0000-4000-8000-000000000001';
const token = () => [btoa(JSON.stringify({alg:'HS256',typ:'JWT'})), btoa(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})), 'test-signature'].join('.');
async function mockAccount(page: Page, completed = false, workspace = false) {
  const user = {id,aud:'authenticated',role:'authenticated',email:'fixture@example.com',email_confirmed_at:new Date().toISOString(),user_metadata:{selected_plan:'complete'},app_metadata:{provider:'email'},created_at:new Date().toISOString()};
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'example.supabase.co') {
      let body: unknown = [];
      if (url.pathname.includes('/auth/v1/user')) body = user;
      if (url.pathname.includes('/auth/v1/token') || url.pathname.includes('/auth/v1/verify')) body = {access_token:token(),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user};
      if (url.pathname.includes('/rest/v1/profiles')) body = [{id,email:user.email,onboarding_completed:completed}];
      if (url.pathname.includes('/rest/v1/wedding_members') && workspace) body = [{id:'member',wedding_id:'20000000-0000-4000-8000-000000000001',user_id:id,role:'owner',status:'active',weddings:{id:'20000000-0000-4000-8000-000000000001',title:'Alex & Sam',partner_one_name:'Alex',partner_two_name:'Sam',slug:'alex-sam',status:'active',timezone:'Europe/London'}}];
      if (url.pathname.includes('/rest/v1/platform_admins')) body = null;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body),headers:{'content-range':'0-0/0'}});
    }
    if (!['localhost','127.0.0.1'].includes(url.hostname)) return route.fulfill({status:200,body:''});
    return route.continue();
  });
}

async function signIn(page: Page) {
 await page.goto('/login');
 await page.getByRole('button',{name:'Reject all',exact:true}).waitFor({state:'visible',timeout:3000}).then(()=>page.getByRole('button',{name:'Reject all',exact:true}).click()).catch(()=>{});
 await page.locator('input[name="email"]').fill('fixture@example.com');
 await page.locator('input[name="password"]').fill('fixture-password');
 await page.getByRole('button',{name:'Log in',exact:true}).click();
}
test('unfinished customer saves setup without a dashboard redirect',async({page})=>{
 await mockAccount(page);
 await signIn(page);
 await expect(page).toHaveURL(/\/app\/onboarding$/);
 await page.getByRole('button',{name:'Save & finish later',exact:true}).click();
 await expect(page).toHaveURL(/\/app\/onboarding$/);
 await expect(page.getByText('Setup progress saved.',{exact:false})).toBeVisible();
});
test('completed customer dashboard and core planning routes render',async({page})=>{
 await mockAccount(page,true,true);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await signIn(page);
 await expect(page).toHaveURL(/\/app\/dashboard$/);
 for(const path of ['/app/dashboard','/app/getting-started','/app/guests','/app/guests/export','/app/guests/new','/app/tasks','/app/budget','/app/invitations','/app/rsvp-settings','/app/billing','/app/support']) {
  await page.goto(path);
  await expect(page.locator('h1,h2').first(),path).toBeVisible();
  expect(errors, path).toEqual([]);
  await expect(page.locator('a[href="/app/admin/operations"]')).toHaveCount(0);
 }
});
test('signup hides verification recovery until an account is created',async({page})=>{
 await page.goto('/signup');
 await expect(page.getByRole('button',{name:'Resend verification email'})).toHaveCount(0);
});

const guestSecret='a'.repeat(64);
const guestData={valid:true,wedding_id:'20000000-0000-4000-8000-000000000001',session_id:guestSecret,data:{wedding:{id:'20000000-0000-4000-8000-000000000001',title:'Alex & Sam',partner_one_name:'Alex',partner_two_name:'Sam',wedding_date:'2027-06-20',timezone:'Europe/London'},invitation:{id:'30000000-0000-4000-8000-000000000001',status:'sent',rsvp_deadline:'2027-05-20',design_document:{canvas:{width:400,height:600,background:{color:'#faf5ef'}},layers:[]}},recipients:[{guest_id:'40000000-0000-4000-8000-000000000001',guest_name:'Test Guest',recipient_role:'primary',ceremony_invited:true,reception_invited:true}],events:[],portal_settings:{portal_enabled:true,rsvp_enabled:true,household_rsvp_enabled:false},rsvp_responses:{}}};
test('personal invitation Respond opens RSVP without crashing',async({page})=>{
 await mockAccount(page);
 await page.route('**/functions/v1/validate-invitation',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(guestData)}));
 await page.route('**/functions/v1/guest-portal-loader',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(guestData)}));
 await page.goto('/invite/'+ 'b'.repeat(64));
 await page.getByRole('button',{name:'Reject all',exact:true}).waitFor({state:'visible',timeout:3000}).then(()=>page.getByRole('button',{name:'Reject all',exact:true}).click()).catch(()=>{});
 const respond=page.getByRole('button',{name:'Respond to invitation',exact:false});
 await expect(respond).toBeEnabled();
 await respond.click();
 await expect(page).toHaveURL(new RegExp('/guest/'+guestSecret+'/rsvp$'));
 await expect(page.getByRole('heading',{name:'You are invited',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Something went wrong'})).toHaveCount(0);
 await page.getByRole('button',{name:'Get started',exact:false}).first().click();
 await expect(page.getByRole('heading',{name:'Your response',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Joyfully accept',exact:false}).click();
 await page.getByRole('button',{name:'Dashboard',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'Keep editing',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Keep editing',exact:true}).click();
 await expect(page).toHaveURL(new RegExp('/guest/'+guestSecret+'/rsvp$'));
 await page.getByRole('button',{name:'Dashboard',exact:true}).first().click();
 await page.getByRole('button',{name:'Leave page',exact:true}).click();
 await expect(page).toHaveURL(new RegExp('/guest/'+guestSecret+'$'));
});
