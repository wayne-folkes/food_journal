import { fireEvent, render, screen } from '@testing-library/react'
import type { MealItem, MealWithItems } from '@shared/types/database'
import { MealCard } from './MealCard'

const authState = vi.hoisted(() => ({ isAuthed: false }))

vi.mock('../lib/store', () => ({
  useEntriesStore: (selector?: (s: { isAuthed: boolean }) => unknown) =>
    selector ? selector({ isAuthed: authState.isAuthed }) : authState,
}))

function makeMeal(overrides: Partial<MealWithItems> = {}): MealWithItems {
  return {
    id: 'meal-1',
    user_id: null,
    consumed_at: '2026-04-15T09:00:00.000Z',
    meal_type: 'breakfast',
    raw_input: 'Eggs and toast',
    headline: null,
    note: null,
    created_at: '2026-04-15T09:00:00.000Z',
    updated_at: '2026-04-15T09:00:00.000Z',
    items: [
      {
        id: 'item-1',
        meal_id: 'meal-1',
        description: 'Eggs and toast',
        position: 0,
        consumed_at: '2026-04-15T09:00:00.000Z',
        created_at: '2026-04-15T09:00:00.000Z',
        calories: null,
        protein_g: null,
        fiber_g: null,
        qty: null,
      },
    ],
    ...overrides,
  }
}

function makeItem(id: string, overrides: Partial<MealItem> = {}): MealItem {
  return {
    id,
    meal_id: 'meal-1',
    description: id,
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

function renderCard(propsOverride: Record<string, unknown> = {}) {
  const defaults = {
    meal: makeMeal(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onUpdateCalories: vi.fn().mockResolvedValue(undefined),
  }
  const props = { ...defaults, ...propsOverride }
  return { ...render(<MealCard {...props} />), ...props }
}

describe('MealCard', () => {
  beforeEach(() => { authState.isAuthed = false })

  it('renders meal type and item description', () => {
    renderCard()
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getAllByText('Eggs and toast').length).toBeGreaterThan(0)
  })

  it('opens the menu when the options button is clicked', () => {
    renderCard()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Meal options'))

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Log again')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('adds menu-open class to card when menu is open for z-index stacking', () => {
    renderCard()
    const card = document.querySelector('.meal-card')!
    expect(card.classList.contains('meal-card--menu-open')).toBe(false)

    fireEvent.click(screen.getByLabelText('Meal options'))
    expect(card.classList.contains('meal-card--menu-open')).toBe(true)
  })

  it('calls onDelete with the meal id when Delete is clicked', () => {
    const { onDelete } = renderCard()

    fireEvent.click(screen.getByLabelText('Meal options'))
    fireEvent.click(screen.getByText('Delete'))

    expect(onDelete).toHaveBeenCalledWith('meal-1')
  })

  it('closes the menu after Delete is clicked', () => {
    renderCard()

    fireEvent.click(screen.getByLabelText('Meal options'))
    expect(screen.getByText('Delete')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Delete'))
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('calls onEdit with the meal when Edit is clicked', () => {
    const meal = makeMeal()
    const { onEdit } = renderCard({ meal })

    fireEvent.click(screen.getByLabelText('Meal options'))
    fireEvent.click(screen.getByText('Edit'))

    expect(onEdit).toHaveBeenCalledWith(meal)
  })

  it('calls onDuplicate with the meal when Log again is clicked', () => {
    const meal = makeMeal()
    const { onDuplicate } = renderCard({ meal })

    fireEvent.click(screen.getByLabelText('Meal options'))
    fireEvent.click(screen.getByText('Log again'))

    expect(onDuplicate).toHaveBeenCalledWith(meal)
  })

  it('closes the menu when the backdrop is clicked', () => {
    renderCard()

    fireEvent.click(screen.getByLabelText('Meal options'))
    expect(screen.getByText('Delete')).toBeInTheDocument()

    // The backdrop is the first sibling element inside the menu overlay
    const backdrop = document.querySelector('.meal-card__menu-backdrop')!
    fireEvent.click(backdrop)

    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })
  describe('protein and fiber', () => {
    it('shows per-item protein and fiber, only the parts that exist', () => {
      const meal = makeMeal({
        items: [
          makeItem('Eggs', { calories: 140, protein_g: 12, fiber_g: 0.5 }),
          makeItem('Toast', { position: 1, calories: 80, protein_g: 3.2 }),
          makeItem('Jam', { position: 2, calories: 50 }),
        ],
      })
      renderCard({ meal })

      expect(screen.getByText('12 g protein · 0.5 g fiber')).toBeInTheDocument()
      expect(screen.getByText('3.2 g protein')).toBeInTheDocument()
      expect(document.querySelectorAll('.meal-card__nutrients')).toHaveLength(2)
    })

    it('shows meal totals, with ~ when some items are missing the value', () => {
      const meal = makeMeal({
        items: [
          makeItem('Eggs', { protein_g: 12, fiber_g: 1 }),
          makeItem('Toast', { position: 1, protein_g: 3, fiber_g: 2 }),
          makeItem('Jam', { position: 2, protein_g: 0.2 }),
        ],
      })
      renderCard({ meal })

      const totals = document.querySelector('.meal-card__totals')!
      expect(totals).toHaveTextContent('Protein 15.2 g')
      expect(totals).not.toHaveTextContent('Protein ~')
      expect(totals).toHaveTextContent('Fiber ~3 g')
    })

    it('shows nothing when no item has protein or fiber (including pre-migration undefined values)', () => {
      const legacy = makeItem('Eggs', { calories: 100 }) as Partial<MealItem> as MealItem
      delete (legacy as Partial<MealItem>).protein_g
      delete (legacy as Partial<MealItem>).fiber_g
      renderCard({ meal: makeMeal({ items: [legacy] }) })

      expect(document.querySelector('.meal-card__nutrients')).toBeNull()
      expect(document.querySelector('.meal-card__totals')).toBeNull()
    })

    it('renders a 0 g value', () => {
      renderCard({ meal: makeMeal({ items: [makeItem('Water', { protein_g: 0, fiber_g: 0 })] }) })
      expect(screen.getByText('0 g protein · 0 g fiber')).toBeInTheDocument()
    })
  })

  describe('estimate nutrition button', () => {
    const complete = { calories: 100, protein_g: 1, fiber_g: 1 }

    it('is hidden for anonymous users', () => {
      renderCard({ meal: makeMeal({ items: [makeItem('a')] }), onEstimateCalories: vi.fn() })
      expect(screen.queryByRole('button', { name: /estimate/i })).not.toBeInTheDocument()
    })

    it('appears for authed users when only protein is missing', () => {
      authState.isAuthed = true
      renderCard({
        meal: makeMeal({ items: [makeItem('a', { calories: 100, protein_g: null, fiber_g: 2 })] }),
        onEstimateCalories: vi.fn(),
      })
      expect(screen.getByRole('button', { name: 'Estimate calories, protein and fiber' })).toHaveTextContent('Estimate nutrition')
    })

    it('is hidden once every item has calories, protein and fiber', () => {
      authState.isAuthed = true
      renderCard({ meal: makeMeal({ items: [makeItem('a', complete)] }), onEstimateCalories: vi.fn() })
      expect(screen.queryByRole('button', { name: /estimate/i })).not.toBeInTheDocument()
    })

    it('calls onEstimateCalories and shows Estimating… while pending', async () => {
      authState.isAuthed = true
      let resolve!: () => void
      const onEstimateCalories = vi.fn(() => new Promise<void>((r) => { resolve = r }))
      const meal = makeMeal({ items: [makeItem('a')] })
      renderCard({ meal, onEstimateCalories })

      fireEvent.click(screen.getByRole('button', { name: /estimate/i }))
      expect(onEstimateCalories).toHaveBeenCalledWith(meal)
      expect(await screen.findByText(/Estimating…/)).toBeInTheDocument()
      resolve()
      expect(await screen.findByText(/Estimate nutrition/)).toBeInTheDocument()
    })
  })
})
