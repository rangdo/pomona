import { expect, test } from '@playwright/test'
import sharp from 'sharp'

async function makeTestPhoto(): Promise<Buffer> {
  return sharp({
    create: { width: 640, height: 480, channels: 3, background: '#4d7c0f' },
  })
    .jpeg()
    .toBuffer()
}

test('locations: create with image, assign plant, pin by drag, persist, unassign', async ({
  page,
}) => {
  const photo = await makeTestPhoto()

  await page.goto('/#/plants/new')
  await page.getByRole('button', { name: 'Choose species…' }).click()
  await page.getByRole('button', { name: 'Apple', exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Apple' })).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Locations' }).click()
  await expect(page.getByText('No locations yet')).toBeVisible()
  await page.getByRole('link', { name: 'Create your first location' }).click()
  await page.getByLabel('Name *').fill('Back garden')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Gallery' }).click(),
  ])
  await chooser.setFiles({ name: 'garden.jpg', mimeType: 'image/jpeg', buffer: photo })
  await expect(page.getByAltText('Location preview')).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Back garden' })).toBeVisible()
  await expect(page.locator('[data-testid="location-image"] img')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: /Apple/ }).click()
  await page.getByRole('link', { name: 'Edit plant' }).click()
  await page.getByLabel('Location').selectOption({ label: 'Back garden' })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Back garden').first()).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Locations' }).click()
  await page.getByRole('link', { name: /Back garden/ }).click()
  await expect(page.locator('[data-testid="location-image"] img')).toBeVisible()

  await page.getByRole('button', { name: 'Arrange' }).click()
  const chip = page.getByRole('button', { name: /Apple/ })
  const imgBox = await page.locator('[data-testid="location-image"]').boundingBox()
  const chipBox = await chip.boundingBox()
  await page.mouse.move(chipBox!.x + chipBox!.width / 2, chipBox!.y + chipBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(imgBox!.x + imgBox!.width * 0.4, imgBox!.y + imgBox!.height * 0.4, {
    steps: 8,
  })
  await page.mouse.up()

  const pin = page.locator('[aria-label="Pin Apple"]')
  await expect(pin).toBeVisible()
  const leftBefore = await pin.evaluate((el) => (el as HTMLElement).style.left)
  expect(parseFloat(leftBefore)).toBeCloseTo(40, 5)

  const pinBox = await pin.boundingBox()
  await page.mouse.move(pinBox!.x + pinBox!.width / 2, pinBox!.y + pinBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(pinBox!.x + pinBox!.width / 2 + 80, pinBox!.y + pinBox!.height / 2, {
    steps: 8,
  })
  await page.mouse.up()
  await expect
    .poll(async () => parseFloat(await pin.evaluate((el) => (el as HTMLElement).style.left)), {
      timeout: 5_000,
    })
    .toBeGreaterThan(parseFloat(leftBefore) + 10)
  const leftAfter = await pin.evaluate((el) => (el as HTMLElement).style.left)

  await page.getByRole('button', { name: 'Done' }).click()
  await page.reload()
  const leftPersisted = await pin.evaluate((el) => (el as HTMLElement).style.left)
  expect(parseFloat(leftPersisted)).toBeCloseTo(parseFloat(leftAfter), 5)

  await page.getByRole('link', { name: 'Pin Apple' }).click()
  await expect(page.getByRole('heading', { name: 'Apple' })).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Locations' }).click()
  await page.getByRole('link', { name: /Back garden/ }).click()
  await page.getByRole('link', { name: 'Edit location' }).click()
  await page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Delete location' }).click()
  await expect(page.getByText('No locations yet')).toBeVisible()

  await page.getByRole('link', { name: /Apple/ }).click()
  await page.getByRole('link', { name: 'Edit plant' }).click()
  await expect(page.getByLabel('Location')).toHaveValue('')
})
