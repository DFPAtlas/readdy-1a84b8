import { test, expect, type Page } from '@playwright/test';

const id = '10000000-0000-4000-8000-000000000001';
const token = () => [btoa(JSON.stringify({alg:'HS256',typ:'JWT'})), btoa(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})), 'test-signature'].join('.');
async function mockAccount(page: Page, admin = true) {
  const user = {id,aud:'authenticated',role:'authenticated',email:'fixture@example.com',email_confirmed_at:new Date().toISOString(),user_metadata:{selected_plan:'complete'},app_metadata:{provider:'email'},created_at:new Date().toISOString()};
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'example.supabase.co') {
      let body: unknown = [];
      if (url.pathname.includes('/auth/v1/user')) body = user;
      if (url.pathname.includes('/auth/v1/token') || url.pathname.includes('/auth/v1/verify')) body = {access_token:token(),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user};
      if (url.pathname.includes('/rest/v1/profiles')) body = [{id,email:user.email,onboarding_completed:false}];
      if (url.pathname.includes('/rest/v1/platform_admins')) body = admin ? {user_id:id} : null;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    }
    if (!['localhost','127.0.0.1'].includes(url.hostname)) return route.fulfill({status:200,body:''});
    return route.continue();
  });
}

async function login(page: Page, destination = '/login') {
  await page.goto(destination);
  const cookies = page.getByRole('button', {name:'Reject all',exact:true});
  await cookies.waitFor({state:'visible',timeout:3000}).then(() => cookies.click()).catch(() => {});
  await page.locator('input[name="email"]').fill('fixture@example.com');
  await page.locator('input[name="password"]').fill('fixture-password');
  await page.getByRole('button', {name:'Log in', exact:true}).click();
}
test('staff login opens admin without wedding onboarding and navigates back', async ({page}) => {
  await mockAccount(page);
  await login(page);
  await expect(page).toHaveURL(/\/app\/admin\/operations$/);
  const nav = page.getByRole('navigation', {name:'Administration'});
  await expect(nav).toBeVisible();
  await nav.getByRole('link', {name:'Support',exact:true}).click();
  await expect(page).toHaveURL(/\/app\/admin\/support$/);
  await nav.getByRole('link', {name:'Admin dashboard'}).click();
  await expect(page).toHaveURL(/\/app\/admin\/operations$/);
});
for (const path of ['/app/admin', '/app/admin/dashboard']) {
  test(`staff entry ${path} survives login`, async ({page}) => {
    await mockAccount(page);
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await login(page, page.url());
    await expect(page).toHaveURL(/\/app\/admin\/operations$/);
  });
}
test('customer cannot enter admin dashboard', async ({page}) => {
  await mockAccount(page,false);
  await login(page,'/login?redirect=%2Fapp%2Fadmin%2Fdashboard');
  await expect(page.getByRole('heading',{name:'Administrator access required'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Administration'})).toHaveCount(0);
});
