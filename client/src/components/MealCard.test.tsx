import { fireEvent, render, screen } from '@testing-library/react'
import type { MealWithItems } from '@shared/types/database'
import { MealCard } from './MealCard'

vi.mock('../lib/store', () => ({
  useEntriesStore: () => false,
}))

function makeMeal(overrides: Partial<MealWithItems> = {}): MealWithItems {
  return {
    id: 'meal-1',
    user_id: null,
    consumed_at: '2026-04-15T09:00:00.000Z',
    meal_type: 'breakfast',
    raw_input: 'Eggs and toast',
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
      },
    ],
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
  it('renders meal type and item description', () => {
    renderCard()
    expect(screen.getByText('— Breakfast')).toBeInTheDocument()
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
})
