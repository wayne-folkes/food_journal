import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear the Zustand persisted store so each test starts fresh. */
async function clearStore(page: Page) {
  await page.evaluate(() => localStorage.removeItem('food_journal_entries'))
}

/** Type text into the main input and submit via the keyboard or button. */
async function fillInput(page: Page, text: string) {
  await page.getByPlaceholder('What did you eat or drink?').fill(text)
}

async function submitWithEnter(page: Page) {
  await page.getByPlaceholder('What did you eat or drink?').press('Enter')
}

async function submitWithButton(page: Page) {
  await page.getByRole('button', { name: 'Add' }).click()
}

/** Add an entry via Enter key and wait for it to appear in the log. */
async function addEntry(page: Page, text: string, expectedDesc?: string) {
  await fillInput(page, text)
  await submitWithEnter(page)
  const desc = expectedDesc ?? text
  await expect(page.locator('.entry-row__desc', { hasText: desc }).first()).toBeVisible()
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Food Journal – anonymous golden path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStore(page)
    // Reload so the app picks up the cleared store before each test
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  // -------------------------------------------------------------------------
  // 1. Golden path – submit with Enter
  // -------------------------------------------------------------------------
  test.describe('Golden path', () => {
    test("type entry and press Enter → appears in Today's Log", async ({ page }) => {
      await fillInput(page, 'scrambled eggs')
      await submitWithEnter(page)

      // Section heading
      await expect(page.getByRole('heading', { name: "Today's Log" })).toBeVisible()

      // Entry description
      await expect(page.locator('.entry-row__desc', { hasText: 'scrambled eggs' })).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // 2. Add with button
  // -------------------------------------------------------------------------
  test.describe('Add with button', () => {
    test('type entry and click Add button → appears in log', async ({ page }) => {
      await fillInput(page, 'black coffee')
      await submitWithButton(page)

      await expect(page.getByRole('heading', { name: "Today's Log" })).toBeVisible()
      await expect(page.locator('.entry-row__desc', { hasText: 'black coffee' })).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // 3. Time parsing – "pizza at noon" → description is "pizza" (time stripped)
  // -------------------------------------------------------------------------
  test.describe('Time parsing', () => {
    test('"pizza at noon" → description does not contain "noon"', async ({ page }) => {
      await fillInput(page, 'pizza at noon')
      await submitWithEnter(page)

      await expect(page.getByRole('heading', { name: "Today's Log" })).toBeVisible()

      // The parser strips the matched time expression ("at noon"), leaving "pizza"
      const desc = page.locator('.entry-row__desc').first()
      await expect(desc).toBeVisible()
      await expect(desc).not.toContainText('noon')
      // Description should contain "pizza"
      await expect(desc).toContainText('pizza')
    })
  })

  // -------------------------------------------------------------------------
  // 4. Delete entry
  // -------------------------------------------------------------------------
  test.describe('Delete entry', () => {
    test('add entry → click delete → entry disappears', async ({ page }) => {
      await addEntry(page, 'green tea')

      // Hover the row to reveal actions, then click the delete button
      const row = page.locator('.entry-row', { hasText: 'green tea' })
      await row.hover()
      await row.getByTitle('Delete').click()

      // Entry should be gone
      await expect(page.locator('.entry-row__desc', { hasText: 'green tea' })).not.toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // 5. Edit entry
  // -------------------------------------------------------------------------
  test.describe('Edit entry', () => {
    test('add entry → open edit modal → change description → Save Changes → updated text appears', async ({ page }) => {
      await addEntry(page, 'toast')

      // Hover to reveal actions, click edit
      const row = page.locator('.entry-row', { hasText: 'toast' })
      await row.hover()
      await row.getByTitle('Edit').click()

      // Modal should be open
      await expect(page.getByRole('heading', { name: 'Edit Entry' })).toBeVisible()

      // Clear and update description field (the first input inside the modal)
      const descInput = page.locator('.modal .input[type="text"]')
      await descInput.clear()
      await descInput.fill('avocado toast')

      // Save
      await page.getByRole('button', { name: 'Save Changes' }).click()

      // Modal should close and updated description should be in the log
      await expect(page.getByRole('heading', { name: 'Edit Entry' })).not.toBeVisible()
      await expect(page.locator('.entry-row__desc', { hasText: 'avocado toast' })).toBeVisible()

      // Old description should be gone
      await expect(page.locator('.entry-row__desc', { hasText: 'toast' }).filter({ hasNotText: 'avocado' })).not.toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // 6. Recent chips
  // -------------------------------------------------------------------------
  test.describe('Recent chips', () => {
    test('add two entries → chips appear → click chip → second entry added', async ({ page }) => {
      // Add first entry
      await addEntry(page, 'oatmeal')

      // Add second entry
      await addEntry(page, 'black coffee')

      // Both chips should be visible (most recent first)
      await expect(page.locator('.chip', { hasText: 'black coffee' })).toBeVisible()
      await expect(page.locator('.chip', { hasText: 'oatmeal' })).toBeVisible()

      // Count oatmeal entries before clicking chip
      const oatmealsBefore = await page.locator('.entry-row__desc', { hasText: 'oatmeal' }).count()

      // Click the oatmeal chip to re-log it
      await page.locator('.chip', { hasText: 'oatmeal' }).click()

      // A second oatmeal entry should now appear
      await expect(page.locator('.entry-row__desc', { hasText: 'oatmeal' })).toHaveCount(oatmealsBefore + 1)
    })
  })

  // -------------------------------------------------------------------------
  // 7. Persist on refresh
  // -------------------------------------------------------------------------
  test.describe('Persist on refresh', () => {
    test('add entry → reload page → entry still shows', async ({ page }) => {
      await addEntry(page, 'banana')

      // Reload the page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Entry should still be visible
      await expect(page.getByRole('heading', { name: "Today's Log" })).toBeVisible()
      await expect(page.locator('.entry-row__desc', { hasText: 'banana' })).toBeVisible()
    })
  })
})
