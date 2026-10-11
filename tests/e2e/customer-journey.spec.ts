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
 await expect(page.getByText('Private draft', {exact:true})).toBeVisible();
 await expect(page.getByText('Date not set', {exact:true})).toBeVisible();
 await expect(page.getByText('Your guest page is live', {exact:true})).toHaveCount(0);
 await expect(page.getByRole('link', {name:'Email your guests',exact:false})).toHaveCount(0);
 await expect(page.getByRole('button', {name:'Notifications — 8 unread',exact:true})).toHaveCount(0);
 await expect(page.getByText('70%', {exact:true})).toHaveCount(0);
 for(const path of ['/app/dashboard','/app/getting-started','/app/guests','/app/guests/export','/app/guests/new','/app/tasks','/app/budget','/app/invitations','/app/rsvp-settings','/app/billing','/app/support']) {
  await page.goto(path);
  await expect(page.locator('h1,h2').first(),path).toBeVisible();
  expect(errors, path).toEqual([]);
  await expect(page.locator('a[href="/app/admin/operations"]')).toHaveCount(0);
 }
});
test('guest email edits survive rerenders and save the entered address',async({page})=>{
 await mockAccount(page,true,true);
 const guestId='40000000-0000-4000-8000-000000000002';
 let guest={id:guestId,wedding_id:'20000000-0000-4000-8000-000000000001',full_name:'Taylor',last_name:'Test',email:'',status:'active',guest_type:'adult'};
 let reads=0;
 let savedEmail='';
 await page.route('**/rest/v1/guests?**',async route=>{
  if(route.request().method()==='PATCH') {
   const payload=route.request().postDataJSON(); savedEmail=payload.email;
   guest={...guest,...payload};
   return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  }
  reads++;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(guest)});
 });
 await signIn(page);
 await expect(page).toHaveURL(/\/app\/dashboard$/);
 await page.goto(`/app/guests/${guestId}/edit`);
 const email=page.getByPlaceholder('guest@email.com');
 await expect(email).toBeVisible();
 const initialReads=reads;
 await email.fill('uat@example.com');
 await page.getByPlaceholder('e.g. Williams').fill('Updated');
 await expect(email).toHaveValue('uat@example.com');
 expect(reads).toBe(initialReads);
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page).toHaveURL(new RegExp(`/app/guests/${guestId}$`));
 expect(savedEmail).toBe('uat@example.com');
 await expect(page.getByText('uat@example.com',{exact:true})).toBeVisible();
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

test('declining skips attendance-only steps and goes directly to review',async({page})=>{
 await mockAccount(page);
 await page.route('**/functions/v1/guest-portal-loader',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(guestData)}));
 await page.goto('/guest/'+guestSecret+'/rsvp');
 await page.getByRole('button',{name:'Reject all',exact:true}).waitFor({state:'visible',timeout:3000}).then(()=>page.getByRole('button',{name:'Reject all',exact:true}).click()).catch(()=>{});
 await page.getByRole('button',{name:'Get started',exact:false}).first().click();
 await page.getByRole('button',{name:'Joyfully accept',exact:false}).click();
 await expect(page.getByRole('button',{name:/Events/})).toBeVisible();
 await page.getByRole('button',{name:'Regretfully decline',exact:false}).click();
 await expect(page.getByRole('button',{name:/Events|Dietary|Travel|Extras/})).toHaveCount(0);
 await expect(page.getByText('You can review and submit your response next.')).toBeVisible();
 await page.getByRole('button',{name:'Next',exact:false}).click();
 await expect(page.getByRole('heading',{name:'Review your response',exact:true})).toBeVisible();
 await expect(page.getByText('Regretfully declined',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Submit RSVP',exact:false})).toBeEnabled();
});

async function openGuestRsvp(page: Page, data = guestData) {
 await mockAccount(page);
 await page.route('**/functions/v1/guest-portal-loader',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}));
 await page.goto('/guest/'+guestSecret+'/rsvp');
 await page.getByRole('button',{name:'Reject all',exact:true}).waitFor({state:'visible',timeout:3000}).then(()=>page.getByRole('button',{name:'Reject all',exact:true}).click()).catch(()=>{});
}
test('RSVP validation is visible and successful drafts show confirmation',async({page})=>{
 await openGuestRsvp(page);
 let submissions=0;
 await page.route('**/functions/v1/submit-rsvp',async route=>{
  const body=route.request().postDataJSON();
  expect(body.session_hash).toBe(guestSecret);
  expect(body.save_draft).toBe(true);
  submissions++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})});
 });
 await page.getByRole('button',{name:/Review/}).click();
 await page.getByRole('button',{name:/Submit RSVP/}).click();
 await expect(page.getByText('Please choose whether you can attend before submitting.')).toBeVisible();
 expect(submissions).toBe(0);
 await page.getByRole('button',{name:/Attendance/}).click();
 await page.getByRole('button',{name:/Joyfully accept/}).click();
 await page.getByRole('button',{name:/Review/}).click();
 await page.getByRole('button',{name:/Submit RSVP/}).click();
 await expect(page.getByText('Please select at least one event you plan to attend.')).toBeVisible();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Your draft has been saved.');
 expect(submissions).toBe(1);
});
test('saving one household member preserves warnings for other unsaved answers',async({page})=>{
 const household={...guestData,data:{...guestData.data,portal_settings:{...guestData.data.portal_settings,household_rsvp_enabled:true},recipients:[...guestData.data.recipients,{...guestData.data.recipients[0],guest_id:'40000000-0000-4000-8000-000000000002',guest_name:'Second Guest'}]}};
 await openGuestRsvp(page,household);
 await page.route('**/functions/v1/submit-rsvp',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})}));
 await page.getByRole('button',{name:/Attendance/}).click();
 await page.getByRole('button',{name:/Regretfully decline/}).click();
 await page.getByRole('button',{name:/Household/}).click();
 await page.getByRole('button',{name:/Second Guest Not yet started/}).click();
 await page.getByRole('button',{name:/Attendance/}).click();
 await page.getByRole('button',{name:/Regretfully decline/}).click();
 await page.getByRole('button',{name:/Review/}).click();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Your draft has been saved.');
 await page.getByRole('button',{name:'Dashboard',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'Keep editing',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Keep editing',exact:true}).click();
 await page.getByRole('button',{name:/Submit RSVP/}).click();
 await expect(page.getByRole('button',{name:'Respond for another household member'})).toBeVisible();
 await page.getByRole('button',{name:'Respond for another household member'}).click();
 await expect(page.getByRole('heading',{name:'Your household'})).toBeVisible();
});
