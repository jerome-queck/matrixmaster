import { expect, test, type Page } from '@playwright/test';

const pageIssues = new WeakMap<Page, string[]>();

const ignoredConsolePatterns = [
  /download the react devtools/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
];

test.beforeEach(async ({ page }) => {
  const issues: string[] = [];
  pageIssues.set(page, issues);

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) return;
    issues.push(`console error: ${text}`);
  });

  page.on('pageerror', (error) => {
    issues.push(`page error: ${error.message}`);
  });
});

test.afterEach(async ({ page }) => {
  expect(pageIssues.get(page) ?? []).toEqual([]);
});

const openApp = async (page: Page) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }
    `,
  });

  await expect(page).toHaveTitle('Matrix Master');
  await expect(page.getByRole('heading', { name: 'Matrix Master' })).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByText('Core-first linear algebra workflows.')).toBeVisible();
};

const mainPanel = (page: Page) => page.getByRole('main');

const fillVisibleMatrix = async (page: Page, values: string[][], offset = 0) => {
  const cells = mainPanel(page).getByLabel(/matrix cell row \d+ column \d+/i);
  for (let row = 0; row < values.length; row += 1) {
    for (let col = 0; col < values[row].length; col += 1) {
      const index = offset + row * values[row].length + col;
      const cell = cells.nth(index);
      await expect(cell).toBeVisible();
      await cell.fill(values[row][col]);
      await cell.press('Tab');
    }
  }
};

const expectNoHorizontalPageOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(4);
};

const openCommandPalette = async (page: Page) => {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+KeyK`);
  const dialog = page.getByRole('dialog', { name: /command palette/i });
  await expect(dialog).toBeVisible();
  return dialog;
};

const openMoreMenu = async (page: Page) => {
  await page.getByRole('button', { name: /open more menu/i }).click();
  const dialog = page.getByRole('dialog', { name: /^more$/i });
  await expect(dialog).toBeVisible();
  return dialog;
};

const openRoute = async (page: Page, name: RegExp | string, heading: RegExp | string) => {
  await page.getByRole('button', { name }).click();
  await expect(mainPanel(page).getByRole('heading', { name: heading })).toBeVisible();
};

test.describe('Matrix Master core browser workflows', () => {
  test('renders the app shell and navigates primary routes on desktop and mobile', async ({ page }) => {
    await openApp(page);

    await expect(mainPanel(page).getByRole('heading', { name: 'System Type' })).toBeVisible();
    await openRoute(page, /^matrix operations$/i, 'Matrix Expression');
    await openRoute(page, /^analysis$/i, 'Matrix Analysis');
    await openRoute(page, /^library$/i, 'Library');
    await expect(mainPanel(page).getByText(/no catalog objects found/i)).toBeVisible();
    await openRoute(page, /^system solver$/i, 'System Type');
    await expectNoHorizontalPageOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Matrix Master' })).toBeVisible();
    await expect(mainPanel(page).getByRole('heading', { name: 'System Type' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^analysis$/i })).toBeVisible();
    await openMoreMenu(page);
    await expect(page.getByRole('dialog', { name: /^more$/i }).getByRole('button', { name: /export \/ import/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /^more$/i })).toBeHidden();
    await expectNoHorizontalPageOverflow(page);
  });

  test('solves a non-homogeneous system and exposes result sections', async ({ page }) => {
    await openApp(page);

    await page.getByRole('button', { name: /non-homogeneous/i }).click();
    await page.getByLabel(/rows/i).fill('2');
    await page.getByLabel(/coeff\. cols/i).fill('2');
    await fillVisibleMatrix(page, [
      ['1', '1', '3'],
      ['2', '-1', '0'],
    ]);

    await page.getByRole('button', { name: /^calculate$/i }).click();

    await expect(page.getByText('Consistent')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Row Echelon Form (REF)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reduced Row Echelon Form (RREF)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solution Set (from RREF)', exact: true })).toBeVisible();
  });

  test('calculates a matrix expression from the operations route', async ({ page }) => {
    await openApp(page);
    await openRoute(page, /^matrix operations$/i, 'Matrix Expression');

    await fillVisibleMatrix(page, [
      ['1', '0'],
      ['0', '1'],
    ]);
    await fillVisibleMatrix(page, [
      ['2', '3'],
      ['4', '5'],
    ], 4);

    await page.getByRole('button', { name: /^calculate$/i }).click();

    await expect(page.getByRole('button', { name: /step-by-step calculation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^final result$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /use result/i })).toBeVisible();
  });

  test('analyzes a numeric matrix and opens an advanced discovery route', async ({ page }) => {
    await openApp(page);
    await openRoute(page, /^analysis$/i, 'Matrix Analysis');

    await page.getByLabel(/rows/i).fill('2');
    await page.getByLabel(/cols/i).fill('2');
    await fillVisibleMatrix(page, [
      ['1', '2'],
      ['3', '4'],
    ]);

    await page.getByRole('button', { name: /^analyze$/i }).click();

    await expect(page.getByRole('button', { name: /^summary$/i })).toBeVisible();
    await expect(mainPanel(page).locator('span').filter({ hasText: /^Rank:$/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'LU Decomposition', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'QR Decomposition', exact: true })).toBeVisible();

    await page.getByRole('button', { name: /exact spaces and maps/i }).click();
    await expect(page.getByRole('dialog', { name: /exact algebra studio/i })).toBeVisible();
  });

  test('covers command palette navigation, library loaded state, and export modal controls', async ({ page }) => {
    await openApp(page);

    await page.getByLabel(/rows/i).fill('2');
    await page.getByLabel(/cols/i).fill('2');
    await fillVisibleMatrix(page, [
      ['1', '0'],
      ['0', '1'],
    ]);
    await page.getByRole('button', { name: /save to library/i }).click();
    const saveDialog = page.getByRole('dialog', { name: /save matrix to library/i });
    await expect(saveDialog).toBeVisible();
    await saveDialog.getByPlaceholder(/homework 5/i).fill('E2E Identity');
    await saveDialog.getByPlaceholder(/linear algebra/i).fill('QA');
    await saveDialog.getByPlaceholder(/homework, exam, practice/i).fill('smoke, identity');
    await saveDialog.getByRole('button', { name: /^save$/i }).click();
    await expect(saveDialog).toBeHidden();

    const palette = await openCommandPalette(page);
    await palette.getByPlaceholder(/type a command/i).fill('library');
    await palette.getByRole('button', { name: /go to library/i }).click();

    await expect(mainPanel(page).getByText('E2E Identity')).toBeVisible();
    await expect(mainPanel(page).locator('p').filter({ hasText: /^QA$/ })).toBeVisible();
    await mainPanel(page).getByPlaceholder(/search by name/i).fill('identity');
    await expect(mainPanel(page).getByText('E2E Identity')).toBeVisible();

    const moreDialog = await openMoreMenu(page);
    await moreDialog.getByRole('button', { name: /export \/ import/i }).click();
    const exportDialog = page.getByRole('dialog', { name: /export \/ import/i });
    await expect(exportDialog).toBeVisible();
    await expect(exportDialog.getByRole('button', { name: /export csv/i })).toBeVisible();
    await expect(exportDialog.getByRole('button', { name: /^copy$/i })).toBeVisible();
    await expect(exportDialog.getByText(/csv\/tsv\/latex imports/i)).toBeVisible();
  });
});
