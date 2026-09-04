import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HardCard } from '../HardCard'

describe('HardCard', () => {
  it('defaults to the paper tone', () => {
    render(<HardCard>Body</HardCard>)
    const card = screen.getByText('Body')

    expect(card).toHaveClass('bg-paper')
    expect(card).toHaveClass('text-ink')
  })

  it('carries background and text together for a dark tone', () => {
    // Regression: the dashboard total was once white text on a white card,
    // because the caller passed bg-ink in className and lost to the component's
    // own bg-paper on CSS order alone.
    render(<HardCard tone="ink">Total</HardCard>)
    const card = screen.getByText('Total')

    expect(card).toHaveClass('bg-ink')
    expect(card).toHaveClass('text-paper')
    expect(card).not.toHaveClass('bg-paper')
  })

  it('never emits two background utilities at once', () => {
    render(<HardCard tone="sun">Sun</HardCard>)
    const backgrounds = screen
      .getByText('Sun')
      .className.split(/\s+/)
      .filter((name) => name.startsWith('bg-'))

    expect(backgrounds).toEqual(['bg-sun'])
  })

  it('still accepts layout classes from the caller', () => {
    render(<HardCard className="p-5" tone="ink">Padded</HardCard>)
    expect(screen.getByText('Padded')).toHaveClass('p-5')
  })

  it('renders the requested element', () => {
    render(<HardCard as="section" tone="ink">Section</HardCard>)
    expect(screen.getByText('Section').tagName).toBe('SECTION')
  })
})
