import { render, screen } from '@testing-library/react'
import type { MealItem, MealWithItems } from '@shared/types/database'
import { MealDetail } from './MealDetail'

function item(id: string, overrides: Partial<MealItem> = {}): MealItem {
  return {
    id, meal_id: 'm', description: id, position: 0,
    consumed_at: '2026-04-15T09:00:00.000Z', created_at: '2026-04-15T09:00:00.000Z',
    calories: null, protein_g: null, fiber_g: null, nutrients: null, qty: null, ...overrides,
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

  it('shows carbs and fat up front and keeps micronutrients collapsed under More nutrients', () => {
    renderDetail([
      item('Eggs', { calories: 140, protein_g: 12, fiber_g: 0, nutrients: { carbs_g: 1, fat_g: 10, sodium_mg: 140, vitamin_d_ug: 2 } }),
      item('Toast', { position: 1, calories: 80, protein_g: 3, fiber_g: 2, nutrients: { carbs_g: 15, fat_g: 1 } }),
    ])

    expect(screen.getByText('1 g carbs')).toBeInTheDocument()
    expect(screen.getByText('Carbs').nextSibling).toHaveTextContent('16 g')
    expect(screen.getByText('Fat').nextSibling).toHaveTextContent('11 g')

    const toggle = screen.getByText('More nutrients')
    const details = toggle.closest('details')!
    expect(details).not.toHaveAttribute('open')
    // Sodium: 140 mg of a 2,300 mg DV; only the eggs have it, so it is partial
    expect(screen.getByText('Sodium').nextSibling).toHaveTextContent('~140 mg6%')
    expect(screen.getByText('Vitamin D').nextSibling).toHaveTextContent('~2 µg10%')
    // headline macros are not repeated inside the expander
    expect(details).not.toHaveTextContent('Carbohydrates')
  })

  it('has no More nutrients section when no item has micronutrients', () => {
    renderDetail([item('Eggs', { calories: 140, nutrients: { carbs_g: 1 } })])
    expect(screen.queryByText('More nutrients')).not.toBeInTheDocument()
  })
})

