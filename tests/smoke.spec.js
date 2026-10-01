// 배포 페이지 스모크 테스트 — 조회만 하고 저장·삭제·업로드는 하지 않는다.
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test('페이지가 뜨고 로그인 화면이 보인다', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./');
  await expect(page).toHaveTitle('근태 기록 관리 페이지');
  await expect(page.locator('#authGateOverlay')).toBeVisible();
  await expect(page.locator('#authEmail')).toBeVisible();
  expect(errors, '페이지 스크립트 오류').toEqual([]);
});

test('잘못된 비밀번호는 거부된다', async ({ page }) => {
  await page.goto('./');
  await page.fill('#authEmail', 'nobody@example.com');
  await page.fill('#authPassword', 'wrong-password-xyz');
  await page.click('#authSubmitBtn');
  await expect(page.locator('#authGateStatus')).toContainText('로그인 실패', { timeout: 20_000 });
});

test.describe('테스트 계정 로그인 후 확인', () => {
  test.skip(!EMAIL || !PASSWORD, 'TEST_USER_EMAIL / TEST_USER_PASSWORD 시크릿 미등록');

  test('로그인 → 대시보드 표시 → 로그아웃', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('./');
    await page.fill('#authEmail', EMAIL);
    await page.fill('#authPassword', PASSWORD);
    await page.click('#authSubmitBtn');

    await expect(page.locator('#authGateOverlay')).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('#userLabel')).toContainText(EMAIL);
    await expect(page.locator('#page-summary')).toBeVisible();

    // 열람 전용 계정이면 사이드바가 숨겨지는(share-mode) 것까지 확인
    const label = await page.locator('#userLabel').innerText();
    if (label.includes('열람 전용')) {
      await expect(page.locator('body')).toHaveClass(/share-mode/);
    }

    await page.waitForTimeout(3000); // 대시보드 데이터 로드 대기
    expect(errors, '로그인 후 스크립트 오류').toEqual([]);

    await page.click('#logoutBtn');
    await expect(page.locator('#authGateOverlay')).toBeVisible({ timeout: 20_000 });
  });
});
