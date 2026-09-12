import { expect, test } from '@playwright/test'

test('garden map: bed creation, assignment, tap-through, drag, unassign', async ({
  page,
}) => {
  await page.goto('/#/plants/new')
  await page.getByLabel('Name *').fill('Map Apple')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Map Apple' })).toBeVisible()

  await page.goto('/#/map')
  await expect(page.getByText('No beds yet')).toBeVisible()
  await page.getByRole('link', { name: 'Create your first bed' }).click()
  await page.getByLabel('Name *').fill('South bed')
  await page.getByRole('button', { name: 'Save' }).click()
  const tile = page.locator('article').filter({ hasText: 'South bed' })
  await expect(tile).toBeVisible()

  await page.getByRole('button', { name: 'Add plant to South bed' }).click()
  await page.getByRole('button', { name: /Map Apple/ }).click()
  const chip = tile.getByRole('link', { name: /Map Apple/ })
  await expect(chip).toBeVisible()

  await chip.click()
  await expect(page.getByRole('heading', { name: 'Map Apple' })).toBeVisible()
  await expect(page.getByText('South bed')).toBeVisible()

  await page.goto('/#/map')
  await page.getByRole('button', { name: 'Arrange' }).click()
  const before = await tile.boundingBox()
  await page.mouse.move(before!.x + 10, before!.y + 10)
  await page.mouse.down()
  await page.mouse.move(before!.x + 130, before!.y + 80, { steps: 8 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Done' }).click()

  await page.reload()
  const after = await tile.boundingBox()
  expect(after!.x).toBeGreaterThan(before!.x + 60)

  await page.getByRole('link', { name: 'Edit bed South bed' }).click()
  await expect(page.getByRole('heading', { name: 'Edit bed' })).toBeVisible()
  await page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Delete bed' }).click()
  await expect(page.getByText('No beds yet')).toBeVisible()

  await page.goto('/')
  await page.getByRole('link', { name: /Map Apple/ }).first().click()
  await page.getByRole('link', { name: 'Edit plant' }).click()
  const bedSelect = page.getByLabel('Bed (area)')
  await expect(bedSelect).toHaveValue('')
})
