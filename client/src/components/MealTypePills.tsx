import type { MealType } from '../types/database'
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../lib/mealType'

interface Props {
  value: MealType
  onChange: (type: MealType) => void
}

export function MealTypePills({ value, onChange }: Props) {
  return (
    <div className="meal-type-pills" role="group" aria-label="Meal type">
      {MEAL_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className={`meal-type-pill meal-type-pill--${type}${value === type ? ' meal-type-pill--active' : ''}`}
          onClick={() => onChange(type)}
          aria-pressed={value === type}
        >
          {MEAL_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  )
}
