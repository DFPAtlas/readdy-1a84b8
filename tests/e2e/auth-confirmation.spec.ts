import { test, expect, type Page } from '@playwright/test';

const id = '10000000-0000-4000-8000-000000000001';
const token = () => [btoa(JSON.stringify({alg:'HS256',typ:'JWT'})), btoa(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})), 'test-signature'].join('.');
async function mockAccount(page: Page, completed = false) {
  const user = {id,aud:'authenticated',role:'authenticated',email:'fixture@example.com',email_confirmed_at:new Date().toISOString(),user_metadata:{selected_plan:'complete'},app_metadata:{provider:'email'},created_at:new Date().toISOString()};
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'example.supabase.co') {
      let body: unknown = [];
      if (url.pathname.includes('/auth/v1/user')) body = user;
      if (url.pathname.includes('/auth/v1/token') || url.pathname.includes('/auth/v1/verify')) body = {access_token:token(),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user};
      if (url.pathname.includes('/rest/v1/profiles')) body = [{id,email:user.email,onboarding_completed:completed}];
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    }
    if (!['localhost','127.0.0.1'].includes(url.hostname)) return route.fulfill({status:200,body:''});
    return route.continue();
  });
}
const hash = () => `#access_token=${token()}&refresh_token=fixture-refresh&expires_in=3600&token_type=bearer&type=signup`;

test('confirmation falling back to the homepage continues to paid onboarding', async ({page}) => {
  await mockAccount(page);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/' + hash());
  await expect(page).toHaveURL(/\/app\/onboarding\?plan=complete$/);
  await expect(page.getByText("Let's set up your wedding workspace", {exact:false}).first()).toBeVisible();
  expect(errors).toEqual([]);
});
test('callback ignores a marketing next destination', async ({page}) => {
  await mockAccount(page);
  await page.goto('/auth/callback?next=%2F' + hash());
  await expect(page).toHaveURL(/\/app\/onboarding\?plan=complete$/);
});
test('confirmed existing account continues to dashboard', async ({page}) => {
  await mockAccount(page, true);
  await page.goto('/auth/callback' + hash());
  await expect(page).toHaveURL(/\/app\/dashboard$/);
});
test('direct email token hash confirmation establishes a session', async ({page}) => {
  await mockAccount(page);
  await page.goto('/auth/callback?token_hash=fixture-token&type=email');
  await expect(page).toHaveURL(/\/app\/onboarding\?plan=complete$/);
});
test('PKCE confirmation returned to Site URL exchanges the code', async ({page}) => {
  await mockAccount(page);
  await page.addInitScript(() => localStorage.setItem('sb-example-auth-token-code-verifier', 'fixture-verifier'));
  await page.goto('/?code=fixture-code');
  await expect(page).toHaveURL(/\/app\/onboarding\?plan=complete$/);
});
test('expired confirmation shows a recovery message instead of the homepage', async ({page}) => {
  await mockAccount(page);
  await page.goto('/#error=access_denied&error_code=otp_expired&error_description=Link+expired');
  await expect(page.getByRole('heading', {name:'Verification failed'})).toBeVisible();
  await expect(page.getByRole('link', {name:'Go to login'})).toBeVisible();
});
