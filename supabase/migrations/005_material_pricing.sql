-- ============================================
-- 005: Linear price-per-gram model for materials
-- ============================================
-- effective_ppg = price_per_gram + price_per_gram_slope * min(grams, 200)
-- slope <= 0 gives cheaper per-gram pricing as parts get larger.
-- Default 0 preserves existing flat-rate behaviour.

alter table public.materials
  add column price_per_gram_slope numeric(8,6) not null default 0;
