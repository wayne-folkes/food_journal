-- Editorial columns: user-authored headline, notes, and item quantity
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS note     TEXT;

ALTER TABLE meal_items
  ADD COLUMN IF NOT EXISTS qty TEXT;
