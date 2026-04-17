import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MealWithItems } from '@shared/types/database'
import { SearchOverlay } from './SearchOverlay'

const mockUseEntriesStore = vi.fn()

vi.mock('../lib/store', () => ({
  useEntriesStore: () => mockUseEntriesStore(),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeMeal(description: string, consumedAt = '2026-04-15T09:00:00.000Z'): MealWithItems {
  return {
    id: crypto.randomUUID(),
    user_id: null,
    consumed_at: consumedAt,
    meal_type: 'snack',
    raw_input: description,
    created_at: consumedAt,
    updated_at: consumedAt,
    items: [
      {
        id: crypto.randomUUID(),
        meal_id: crypto.randomUUID(),
        description,
        position: 0,
        consumed_at: consumedAt,
        created_at: consumedAt,
        calories: null,
      },
    ],
  }
}

describe('SearchOverlay', () => {
  afterEach(() => {
    mockUseEntriesStore.mockReset()
  })

  it('ignores stale search responses and keeps the latest results visible', async () => {
    const first = deferred<MealWithItems[]>()
    const second = deferred<MealWithItems[]>()
    const searchMeals = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    mockUseEntriesStore.mockReturnValue({ searchMeals })

    render(<SearchOverlay onClose={() => {}} onNavigateToDate={() => {}} />)

    const input = screen.getByPlaceholderText('Search meals…')

    fireEvent.change(input, { target: { value: 'co' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })

    fireEvent.change(input, { target: { value: 'cof' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })

    await waitFor(() => {
      expect(searchMeals).toHaveBeenNthCalledWith(1, 'co')
      expect(searchMeals).toHaveBeenNthCalledWith(2, 'cof')
    })

    await act(async () => {
      second.resolve([makeMeal('Coffee')])
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(document.querySelector('.meal-card__item')?.textContent).toBe('Coffee')
    })

    await act(async () => {
      first.resolve([makeMeal('Cookies')])
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(document.querySelector('.meal-card__item')?.textContent).toBe('Coffee')
      expect(document.body.textContent).not.toContain('Cookies')
    })
  })
})
