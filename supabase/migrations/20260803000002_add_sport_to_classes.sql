-- Multi-sport: coluna sport em turmas (classes)

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS sport text;

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_sport_check;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_sport_check
    CHECK (sport = ANY (ARRAY['jiu-jitsu'::text, 'muay-thai'::text, 'boxe'::text]));
