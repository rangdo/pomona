import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'

async function makeTestPhoto(): Promise<Buffer> {
  return sharp({
    create: { width: 640, height: 480, channels: 3, background: '#4d7c0f' },
  })
    .jpeg()
    .toBuffer()
}

async function acceptDialog(page: Page): Promise<void> {
  page.once('dialog', (dialog) => void dialog.accept())
}

test('home shows the empty state on first run', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pomona' })).toBeVisible()
  await expect(page.getByText('No plants yet')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Add your first plant' })).toBeVisible()
})

test('full journal workflow: create, observe, edit, delete', async ({ page }) => {
  const photo = await makeTestPhoto()

  await page.goto('/')
  await page.getByRole('link', { name: 'Add your first plant' }).click()
  await expect(page.getByRole('heading', { name: 'Add plant' })).toBeVisible()

  await page.getByLabel('Name *').fill('Test Plum')
  await page.getByLabel('Variety').fill('Victoria')
  await page.getByLabel('Species').fill('Plum')
  await page.getByLabel('Location').fill('Test bed')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('heading', { name: 'Test Plum' })).toBeVisible()
  await expect(page.getByText('No observations yet')).toBeVisible()

  await page.getByRole('link', { name: /New observation/i }).click()
  await expect(page.getByRole('heading', { name: 'New observation' })).toBeVisible()
  await expect(page.getByLabel('Plant')).toContainText('Test Plum')

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'From gallery' }).click(),
  ])
  await chooser.setFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: photo })
  await expect(page.getByAltText('Photo preview')).toBeVisible()

  await page.getByRole('button', { name: 'fruit', exact: true }).click()
  await page.getByRole('button', { name: 'healthy', exact: true }).click()
  await page.getByRole('button', { name: 'harvested', exact: true }).click()
  await page.getByLabel('Fruit count').fill('24')
  await page.getByLabel('Weight (g)').fill('850')
  await page.getByPlaceholder('Anything worth remembering…').fill('first crop')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Test Plum' })).toBeVisible()
  const entry = page.locator('li').filter({ hasText: 'first crop' })
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('24 fruit')
  await expect(entry).toContainText('850 g')
  await expect(entry).toContainText('fruit')
  await expect(entry).toContainText('harvested')
  await expect(entry.locator('img')).toBeVisible()

  await page.reload()
  await expect(page.locator('li').filter({ hasText: 'first crop' })).toContainText('24 fruit')

  await page.getByRole('link', { name: 'Edit observation' }).click()
  await expect(page.getByRole('heading', { name: 'Edit observation' })).toBeVisible()
  await page.getByLabel('Fruit count').fill('30')
  await page.getByLabel('Weight (g)').fill('960')
  await page.getByRole('button', { name: 'Save changes' }).click()

  const edited = page.locator('li').filter({ hasText: 'first crop' })
  await expect(edited).toContainText('30 fruit')
  await expect(edited).toContainText('960 g')
  await expect(edited).not.toContainText('24 fruit')

  await acceptDialog(page)
  await page.getByRole('button', { name: 'Delete observation' }).click()
  await expect(page.getByText('No observations yet')).toBeVisible()

  await page.getByRole('link', { name: 'Edit plant' }).click()
  await acceptDialog(page)
  await page.getByRole('button', { name: 'Delete plant' }).click()
  await expect(page.getByText('No plants yet')).toBeVisible()
})
