import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const MARK = `
  <circle cx="256" cy="300" r="132" fill="#d9f99d"/>
  <circle cx="210" cy="250" r="26" fill="#ecfccb"/>
  <path d="M256 172 q -8 -46 -36 -66" stroke="#365314" stroke-width="20" fill="none" stroke-linecap="round"/>
  <ellipse cx="310" cy="128" rx="54" ry="27" fill="#a3e635" transform="rotate(-28 310 128)"/>
`

function svg(pad) {
  const scale = 1 - (2 * pad) / 512
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#4d7c0f"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})">${MARK}</g>
</svg>`
}

await mkdir('public', { recursive: true })
const jobs = [
  ['icon-512.png', svg(0), 512],
  ['icon-192.png', svg(0), 192],
  ['apple-touch-icon.png', svg(0), 180],
  ['maskable-512.png', svg(72), 512],
]

for (const [name, source, size] of jobs) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(`public/${name}`)
  console.log(`generated public/${name}`)
}
