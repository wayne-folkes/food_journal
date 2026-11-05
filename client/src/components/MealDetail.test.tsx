import { render, screen } from '@testing-library/react'
import type { MealItem, MealWithItems } from '@shared/types/database'
import { MealDetail } from './MealDetail'

function item(id: string, overrides: Partial<MealItem> = {}): MealItem {
  return {
    id, meal_id: 'm', description: id, position: 0,
    consumed_at: '2026-04-15T09:00:00.000Z', created_at: '2026-04-15T09:00:00.000Z',
    calories: null, protein_g: null, fiber_g: null, qty: null, ...overrides,
  }
}

function renderDetail(items: MealItem[]) {
  const meal: MealWithItems = {
    id: 'm', user_id: null, consumed_at: '2026-04-15T09:00:00.000Z', meal_type: 'lunch', raw_input: '',
    headline: null, note: null, created_at: '', updated_at: '', items,
  }
  return render(<MealDetail meal={meal} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onDuplicate={vi.fn()} />)
}

describe('MealDetail nutrition', () => {
  it('shows per-item protein/fiber and Protein / Fiber totals', () => {
    renderDetail([
      item('Eggs', { calories: 140, protein_g: 12, fiber_g: 0.5 }),
      item('Toast', { position: 1, calories: 80, protein_g: 3.5, fiber_g: 2 }),
    ])

    expect(screen.getByText('12 g protein')).toBeInTheDocument()
    expect(screen.getByText('2 g fiber')).toBeInTheDocument()
    expect(screen.getByText('220 kcal')).toBeInTheDocument()
    expect(screen.getByText('Protein').nextSibling).toHaveTextContent('15.5 g')
    expect(screen.getByText('Fiber').nextSibling).toHaveTextContent('2.5 g')
  })

  it('prefixes partial totals with ~ and hides rows nobody has', () => {
    renderDetail([
      item('Eggs', { protein_g: 12 }),
      item('Toast', { position: 1 }),
    ])

    expect(screen.getByText('Protein').nextSibling).toHaveTextContent('~12 g')
    expect(screen.queryByText('Fiber')).not.toBeInTheDocument()
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
  })
})
