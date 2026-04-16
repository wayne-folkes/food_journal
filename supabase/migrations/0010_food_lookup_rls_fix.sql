-- S1 security fix: drop the overly-permissive INSERT policy on food_lookup.
-- The policy name implied service-role-only but had no TO clause, allowing
-- any anon/authenticated caller to write cache rows directly via the REST API.
-- Service role bypasses RLS anyway, so the policy was never needed.
drop policy if exists "Service role can insert food_lookup" on public.food_lookup;
