import { describe, expect, it } from 'vitest'
import { isPdf } from './image'

describe('isPdf', () => {
  it('detects PDFs by mime type', () => {
    const file = new File(['x'], 'plan.pdf', { type: 'application/pdf' })
    expect(isPdf(file)).toBe(true)
  })

  it('detects PDFs by extension when the mime type is missing', () => {
    const file = new File(['x'], 'garden-plan.PDF', { type: '' })
    expect(isPdf(file)).toBe(true)
  })

  it('rejects images', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    expect(isPdf(file)).toBe(false)
  })
})
