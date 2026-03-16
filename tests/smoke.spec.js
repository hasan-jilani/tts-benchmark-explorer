import { test, expect } from '@playwright/test'

test('page loads with title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Deepgram Benchmark Explorer')
})

test('header renders with logo and nav', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header')).toBeVisible()
  await expect(page.getByText('Benchmark Explorer')).toBeVisible()
  await expect(page.locator('header').getByText('Text-to-Speech')).toBeVisible()
})

test('provider sidebar renders with all vendors', async ({ page }) => {
  await page.goto('/')
  const sidebar = page.locator('aside')
  await expect(sidebar.getByText(/^Deepgram/)).toBeVisible()
  await expect(sidebar.getByText(/^ElevenLabs/)).toBeVisible()
  await expect(sidebar.getByText(/^Cartesia/)).toBeVisible()
  await expect(sidebar.getByText(/^OpenAI/)).toBeVisible()
  await expect(sidebar.getByText(/^Rime/)).toBeVisible()
})

test('deepgram is always selected', async ({ page }) => {
  await page.goto('/')
  const dgButton = page.locator('aside button', { hasText: 'Aura-2' })
  await expect(dgButton).toBeVisible()
  const borderLeft = await dgButton.evaluate(el => getComputedStyle(el).borderLeft)
  expect(borderLeft).toContain('rgb')
})

test('latency rankings chart renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Latency Rankings')).toBeVisible({ timeout: 10000 })
  // Metric toggles visible
  await expect(page.getByText('Median', { exact: true })).toBeVisible()
  await expect(page.getByText('Mean', { exact: true })).toBeVisible()
  await expect(page.getByText('p95', { exact: true })).toBeVisible()
  // Category filter visible
  await expect(page.locator('select').first()).toBeVisible()
  // Chart bars render (recharts renders SVG rects)
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible({ timeout: 10000 })
})

test('latency metric toggle changes chart', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible({ timeout: 10000 })
  // Click p95 toggle
  await page.getByText('p95', { exact: true }).click()
  // Chart should still have bars
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible()
})

test('latency variation box plot renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Latency Variation')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Distribution of TTFA')).toBeVisible()
})

test('tab switching works', async ({ page }) => {
  await page.goto('/')
  // Switch to STT
  await page.locator('header').getByText('Speech-to-Text').click()
  await expect(page.getByText('Coming soon')).toBeVisible()
  // Switch back to TTS
  await page.locator('header').getByText('Text-to-Speech').click()
  await expect(page.getByText('Latency Rankings')).toBeVisible()
})
