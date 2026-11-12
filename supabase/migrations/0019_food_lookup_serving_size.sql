-- Typical serving weight (grams) for a cached USDA food. food_lookup keeps
-- storing per-100g nutrient values; the API scales them by serving_g when
-- responding. NULL means USDA listed no portions (or the row predates this
-- migration), and the API treats it as 100 g.
alter table public.food_lookup
  add column serving_g numeric;
