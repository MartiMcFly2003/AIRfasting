-- Seeds the admin-editable copy for the three nutritional-guidance surfaces: the fasting-
-- duration education tooltip, the prep/refeed nudge banner, and the phase food-tip panel.
-- `on conflict do nothing` keeps this re-runnable without clobbering copy an admin has since
-- edited directly in the content table.

insert into public.content (key, value) values
  (
    'education_duration',
    'An overnight fast is roughly 8–12 hours — from your last meal the evening before to breakfast the next morning. A daytime window extends this further. There''s no prescribed duration here — this is entirely your choice based on how you feel.'
  ),
  (
    'prep_day_before',
    'Tomorrow is a fasting day you''ve planned. Keep meals lighter and easier to digest today. Hydrate well. Avoid heavy meals late at night.'
  ),
  (
    'refeed_day_after',
    'You fasted yesterday. Break gently — start with water, then something light and nourishing. Take your time returning to normal eating.'
  ),
  (
    'food_inhale',
    'Oestrogen-supportive foods. Seed cycling: flaxseed + pumpkin seed. Lighter eating around fasting days.'
  ),
  (
    'food_bloom',
    'Protein, minerals, high-fibre foods. Stable blood glucose. Gut support.'
  ),
  (
    'food_radiate',
    'Low-carb on fasting days. Medium carbs if energy drops.'
  ),
  (
    'food_exhale',
    'Progesterone-supportive foods: root vegetables, seeds, complex carbs. No strict restriction.'
  )
on conflict (key) do nothing;
