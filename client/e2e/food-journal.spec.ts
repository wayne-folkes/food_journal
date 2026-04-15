import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Clear local storage before each test to start fresh
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('golden path — log a multi-item meal and see it in the log', async ({ page }) => {
  await page.goto('/')

  // The chip input should be visible
  const chipInput = page.locator('.chip-input__field')
  await expect(chipInput).toBeVisible()

  // Type an item and press Enter to chip it
  await chipInput.fill('scrambled eggs')
  await chipInput.press('Enter')

  // Chip should appear
  await expect(page.locator('.chip-input__chip').first()).toContainText('scrambled eggs')

  // Add another item via comma
  await chipInput.fill('toast,')
  await expect(page.locator('.chip-input__chip').nth(1)).toContainText('toast')

  // Add a third item
  await chipInput.fill('orange juice')
  await chipInput.press('Enter')

  // Save the meal
  await page.locator('button[type="submit"]').click()

  // Meal card should be visible
  await expect(page.locator('.meal-card')).toBeVisible()
  await expect(page.locator('.meal-card__item').first()).toContainText('scrambled eggs')
  await expect(page.locator('.meal-card__item').nth(1)).toContainText('toast')
  await expect(page.locator('.meal-card__item').nth(2)).toContainText('orange juice')
})

test('meal type selection — switching type updates the active pill', async ({ page }) => {
  await page.goto('/')

  // Click "Lunch" pill
  await page.locator('.meal-type-pill', { hasText: 'Lunch' }).click()
  await expect(page.locator('.meal-type-pill--lunch')).toHaveClass(/meal-type-pill--active/)
  await expect(page.locator('.meal-type-pill--breakfast')).not.toHaveClass(/meal-type-pill--active/)
})

test('save button is disabled when no chips are present', async ({ page }) => {
  await page.goto('/')
  const saveBtn = page.locator('button[type="submit"]')
  await expect(saveBtn).toBeDisabled()

  // Add a chip
  await page.locator('.chip-input__field').fill('apple')
  await page.locator('.chip-input__field').press('Enter')
  await expect(saveBtn).not.toBeDisabled()

  // Remove the chip
  await page.locator('.chip-input__remove').click()
  await expect(saveBtn).toBeDisabled()
})

test('log two separate meals — both show in the log', async ({ page }) => {
  await page.goto('/')

  // First meal
  await page.locator('.chip-input__field').fill('oatmeal')
  await page.locator('.chip-input__field').press('Enter')
  await page.locator('button[type="submit"]').click()

  // Second meal
  await page.locator('.chip-input__field').fill('chicken salad')
  await page.locator('.chip-input__field').press('Enter')
  await page.locator('.meal-type-pill', { hasText: 'Lunch' }).click()
  await page.locator('button[type="submit"]').click()

  // Both cards visible
  const cards = page.locator('.meal-card')
  await expect(cards).toHaveCount(2)
})

test('delete a meal', async ({ page }) => {
  await page.goto('/')

  // Add a meal
  await page.locator('.chip-input__field').fill('banana')
  await page.locator('.chip-input__field').press('Enter')
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('.meal-card')).toHaveCount(1)

  // Open menu and delete
  await page.locator('.meal-card__menu-btn').click()
  await page.locator('.meal-card__menu-item--danger').click()

  await expect(page.locator('.meal-card')).toHaveCount(0)
  await expect(page.locator('.meal-log__empty')).toBeVisible()
})

test('edit a meal — change item and save', async ({ page }) => {
  await page.goto('/')

  // Add a meal
  await page.locator('.chip-input__field').fill('coffee')
  await page.locator('.chip-input__field').press('Enter')
  await page.locator('button[type="submit"]').click()

  // Open edit
  await page.locator('.meal-card__menu-btn').click()
  await page.locator('.meal-card__menu-item', { hasText: 'Edit' }).click()

  // Modal should be visible with existing chip
  await expect(page.locator('.modal')).toBeVisible()
  await expect(page.locator('.modal .chip-input__chip')).toContainText('coffee')

  // Remove old chip, add new one
  await page.locator('.modal .chip-input__remove').click()
  await page.locator('.modal .chip-input__field').fill('espresso')
  await page.locator('.modal .chip-input__field').press('Enter')

  // Save
  await page.locator('.modal button[type="submit"]').click()

  // Card should show updated item
  await expect(page.locator('.meal-card__item')).toContainText('espresso')
  await expect(page.locator('.meal-card__item')).not.toContainText('coffee')
})

test('recent chips appear after logging and relog creates a new snack meal', async ({ page }) => {
  await page.goto('/')

  // Log a meal
  await page.locator('.chip-input__field').fill('almonds')
  await page.locator('.chip-input__field').press('Enter')
  await page.locator('button[type="submit"]').click()

  // Recent chip should appear
  await expect(page.locator('.chip', { hasText: 'almonds' })).toBeVisible()

  // Click the recent chip
  await page.locator('.chip', { hasText: 'almonds' }).click()

  // A second meal card should be logged
  await expect(page.locator('.meal-card')).toHaveCount(2)
})

test('data persists after page reload (localStorage)', async ({ page }) => {
  await page.goto('/')

  // Log a meal
  await page.locator('.chip-input__field').fill('yogurt')
  await page.locator('.chip-input__field').press('Enter')
  await page.locator('button[type="submit"]').click()

  // Reload
  await page.reload()

  // Should still be visible
  await expect(page.locator('.meal-card')).toHaveCount(1)
  await expect(page.locator('.meal-card__item')).toContainText('yogurt')
})
