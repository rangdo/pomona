import { expect, test } from '@playwright/test'
import sharp from 'sharp'

test.use({ viewport: { width: 1280, height: 1400 } })

async function makeTestPhoto(): Promise<Buffer> {
  return sharp({
    create: { width: 640, height: 480, channels: 3, background: '#4d7c0f' },
  })
    .jpeg()
    .toBuffer()
}

function makeTestPdf(): Buffer {
  const stream =
    '0.5 0.7 0.3 rg 60 60 475 722 re f\nBT /F1 36 Tf 80 760 Td (Pomona test map) Tj ET'
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((obj, i) => {
    offsets.push(body.length)
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefStart = body.length
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`
  const trailer = `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(body + xref + trailer, 'latin1')
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
  const imgBox = await page.locator('[data-testid="location-map-layer"]').boundingBox()
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

test('locations: PDF garden plan becomes the map and accepts pins', async ({ page }) => {
  await page.goto('/#/plants/new')
  await page.getByRole('button', { name: 'Choose species…' }).click()
  await page.getByRole('button', { name: 'Pear', exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Pear' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Locations' }).click()
  await page.getByRole('link', { name: 'Create your first location' }).click()
  await page.getByLabel('Name *').fill('Allotment')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Gallery' }).click(),
  ])
  await chooser.setFiles({
    name: 'plan.pdf',
    mimeType: 'application/pdf',
    buffer: makeTestPdf(),
  })
  await expect(page.getByAltText('Location preview')).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Allotment' })).toBeVisible()
  await expect(page.locator('[data-testid="location-image"] img')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: /Pear/ }).click()
  await page.getByRole('link', { name: 'Edit plant' }).click()
  await page.getByLabel('Location').selectOption({ label: 'Allotment' })
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Locations' }).click()
  await page.getByRole('link', { name: /Allotment/ }).click()

  await page.getByRole('button', { name: 'Arrange' }).click()
  const chip = page.getByRole('button', { name: /Pear/ })
  const imgBox = await page.locator('[data-testid="location-map-layer"]').boundingBox()
  const chipBox = await chip.boundingBox()
  await page.mouse.move(chipBox!.x + chipBox!.width / 2, chipBox!.y + chipBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(imgBox!.x + imgBox!.width * 0.5, imgBox!.y + imgBox!.height * 0.5, {
    steps: 8,
  })
  await page.mouse.up()
  await expect(page.locator('[aria-label="Pin Pear"]')).toBeVisible()
})

test('locations: zooming the map keeps pin screen size constant', async ({ page }) => {
  await page.goto('/#/plants/new')
  await page.getByRole('button', { name: 'Choose species…' }).click()
  await page.getByRole('button', { name: 'Pear', exact: true }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Pear' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Locations' }).click()
  await page.getByRole('link', { name: 'Create your first location' }).click()
  await page.getByLabel('Name *').fill('Zoom garden')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Gallery' }).click(),
  ])
  await chooser.setFiles({
    name: 'plan.pdf',
    mimeType: 'application/pdf',
    buffer: makeTestPdf(),
  })
  await expect(page.getByAltText('Location preview')).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: /Pear/ }).click()
  await page.getByRole('link', { name: 'Edit plant' }).click()
  await page.getByLabel('Location').selectOption({ label: 'Zoom garden' })
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Locations' }).click()
  await page.getByRole('link', { name: /Zoom garden/ }).click()

  await page.getByRole('button', { name: 'Arrange' }).click()
  const chip = page.getByRole('button', { name: /Pear/ })
  const layer = page.locator('[data-testid="location-map-layer"]')
  const imgBox = await layer.boundingBox()
  const chipBox = await chip.boundingBox()
  await page.mouse.move(chipBox!.x + chipBox!.width / 2, chipBox!.y + chipBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(imgBox!.x + imgBox!.width * 0.5, imgBox!.y + imgBox!.height * 0.5, {
    steps: 8,
  })
  await page.mouse.up()
  const pin = page.locator('[aria-label="Pin Pear"]')
  await expect(pin).toBeVisible()

  const pinBefore = await pin.boundingBox()
  const layerBefore = await layer.boundingBox()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  const layerAfter = await layer.boundingBox()
  const pinAfter = await pin.boundingBox()
  expect(layerAfter!.width).toBeGreaterThan(layerBefore!.width * 2)
  expect(layerAfter!.width).toBeLessThan(layerBefore!.width * 2.6)
  expect(pinAfter!.width).toBeGreaterThan(pinBefore!.width - 2)
  expect(pinAfter!.width).toBeLessThan(pinBefore!.width + 2)

  await page.getByRole('button', { name: 'Reset view' }).click()
  const layerReset = await layer.boundingBox()
  expect(layerReset!.width).toBeCloseTo(layerBefore!.width, 0)

  await page.mouse.move(imgBox!.x + imgBox!.width * 0.5, imgBox!.y + imgBox!.height * 0.5)
  await page.mouse.wheel(0, -300)
  const layerWheel = await layer.boundingBox()
  expect(layerWheel!.width).toBeGreaterThan(layerBefore!.width * 1.3)
})
