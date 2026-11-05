import { fireEvent, render, screen } from '@testing-library/react'
import type { MealItem, MealWithItems } from '@shared/types/database'
import { EditMealModal } from './EditMealModal'

function item(id: string, description: string, overrides: Partial<MealItem> = {}): MealItem {
  return {
    id,
    meal_id: 'meal-1',
    description,
    position: 0,
    consumed_at: '2026-04-15T09:00:00.000Z',
    created_at: '2026-04-15T09:00:00.000Z',
    calories: null,
    protein_g: null,
    fiber_g: null,
    qty: null,
    ...overrides,
  }
}

function makeMeal(items: MealItem[]): MealWithItems {
  return {
    id: 'meal-1',
    user_id: 'u',
    consumed_at: '2026-04-15T09:00:00.000Z',
    meal_type: 'breakfast',
    raw_input: items.map((i) => i.description).join(', '),
    headline: null,
    note: null,
    created_at: '2026-04-15T09:00:00.000Z',
    updated_at: '2026-04-15T09:00:00.000Z',
    items,
  }
}

// jsdom's step-mismatch check uses float math (12.5 % 0.1 != 0), which real
// browsers don't, so submit the form directly instead of clicking the button.
function save() {
  fireEvent.submit(screen.getByRole('button', { name: 'Save Changes' }).closest('form')!)
}

function setup(items: MealItem[]) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(<EditMealModal meal={makeMeal(items)} onSave={onSave} onCancel={onCancel} />)
  return { onSave, onCancel }
}

describe('EditMealModal nutrition', () => {
  it('shows existing calories, protein and fiber in three inputs per item', () => {
    setup([item('i1', 'Eggs', { calories: 140, protein_g: 12.5, fiber_g: 0 })])

    expect(screen.getByText('Nutrition (optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Calories for Eggs')).toHaveValue(140)
    expect(screen.getByLabelText('Protein for Eggs')).toHaveValue(12.5)
    expect(screen.getByLabelText('Fiber for Eggs')).toHaveValue(0)
  })

  it('passes untouched protein and fiber back through onSave', () => {
    const { onSave } = setup([item('i1', 'Eggs', { calories: 140, protein_g: 12.5, fiber_g: 0.4 })])

    save()

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][1].items).toEqual([
      { id: 'i1', description: 'Eggs', calories: 140, protein_g: 12.5, fiber_g: 0.4 },
    ])
  })

  it('preserves undefined (legacy) protein/fiber as null on save', () => {
    const legacy = item('i1', 'Eggs', { calories: 140 }) as Partial<MealItem>
    delete legacy.protein_g
    delete legacy.fiber_g
    const { onSave } = setup([legacy as MealItem])

    save()

    expect(onSave.mock.calls[0][1].items[0]).toMatchObject({ protein_g: null, fiber_g: null })
  })

  it('saves edited protein and fiber, rounded to 1 decimal and clamped', () => {
    const { onSave } = setup([item('i1', 'Eggs'), item('i2', 'Toast', { position: 1 })])

    fireEvent.change(screen.getByLabelText('Protein for Eggs'), { target: { value: '12.34' } })
    fireEvent.change(screen.getByLabelText('Fiber for Eggs'), { target: { value: '5000' } })
    fireEvent.change(screen.getByLabelText('Protein for Toast'), { target: { value: '-3' } })
    save()

    const items = onSave.mock.calls[0][1].items
    expect(items[0]).toMatchObject({ id: 'i1', protein_g: 12.3, fiber_g: 999.9 })
    expect(items[1]).toMatchObject({ id: 'i2', protein_g: 0, fiber_g: null })
  })

  it('clears a value to null when the input is emptied', () => {
    const { onSave } = setup([item('i1', 'Eggs', { protein_g: 12, fiber_g: 3 })])

    fireEvent.change(screen.getByLabelText('Protein for Eggs'), { target: { value: '' } })
    save()

    expect(onSave.mock.calls[0][1].items[0]).toMatchObject({ protein_g: null, fiber_g: 3 })
  })

  it('treats a protein-only change as dirty (asks before discarding)', () => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    const { onCancel } = setup([item('i1', 'Eggs')])

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText('Protein for Eggs'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('keeps protein and fiber when another chip is added', () => {
    const { onSave } = setup([item('i1', 'Eggs', { protein_g: 12, fiber_g: 1 })])

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Toast,' } })
    save()

    const items = onSave.mock.calls[0][1].items
    expect(items[0]).toMatchObject({ id: 'i1', protein_g: 12, fiber_g: 1 })
    expect(items[1]).toMatchObject({ description: 'Toast', calories: null, protein_g: null, fiber_g: null })
  })
})
