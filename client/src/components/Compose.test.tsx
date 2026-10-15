import { fireEvent, render, screen } from '@testing-library/react'
import { Compose } from './Compose'

const NOON = new Date(2024, 5, 15, 12, 0, 0, 0)

function setup(variant: 'panel' | 'dock' = 'panel', value = '') {
  const onChange = vi.fn()
  const onSubmit = vi.fn()
  render(<Compose variant={variant} value={value} onChange={onChange} now={NOON} onSubmit={onSubmit} />)
  return { onChange, onSubmit }
}

describe('Compose', () => {
  it('shows the hint and a disabled log button when empty', () => {
    setup()
    expect(screen.getByText(/Separate items with commas/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log meal/ })).toBeDisabled()
  })

  it('splits the typed text into capitalised bubbles', () => {
    setup('panel', 'oats, honey and blueberries')
    const bubbles = [...document.querySelectorAll('[data-src-chip]')].map((b) => b.textContent)
    expect(bubbles).toEqual(['Oats', 'Honey', 'Blueberries'])
  })

  it('suggests the meal type from the clock and cycles on tap', () => {
    setup()
    const pill = screen.getByRole('button', { name: /Meal type: Lunch/ })
    fireEvent.click(pill)
    // lunch → snack in day-flow order
    expect(screen.getByRole('button', { name: /Meal type: Snack/ })).toBeInTheDocument()
  })

  it('submits the parsed items with the selected meal type', () => {
    const { onSubmit } = setup('panel', 'oats, honey')
    fireEvent.click(screen.getByRole('button', { name: 'Log meal ↵' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      mealType: 'lunch',
      items: ['Oats', 'Honey'],
      rawInput: 'oats, honey',
    })
  })

  it('clears the text on Escape', () => {
    const { onChange } = setup('panel', 'oats')
    fireEvent.keyDown(screen.getByLabelText('What did you eat?'), { key: 'Escape' })
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('renders the docked variant with a circular log button', () => {
    setup('dock', 'toast')
    expect(screen.getByRole('button', { name: 'Log meal' })).toBeEnabled()
  })
})
