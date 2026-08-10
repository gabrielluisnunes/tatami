-- Backfill: alunos legados (pré multi-sport) sem linha em student_sports
-- Graduações usa v_trainings_since_belt, que parte de student_sports — sem row o aluno some da lista.

INSERT INTO public.student_sports (student_id, academy_id, sport, belt, degree, created_at)
SELECT
  p.id,
  p.academy_id,
  CASE
    WHEN p.sport = ANY (ARRAY['jiu-jitsu'::text, 'muay-thai'::text, 'boxe'::text])
      THEN p.sport
    ELSE 'jiu-jitsu'::text
  END AS sport,
  CASE
    WHEN COALESCE(p.sport, 'jiu-jitsu') = 'boxe' THEN NULL
    WHEN p.belt IS NOT NULL THEN p.belt
    WHEN COALESCE(p.sport, 'jiu-jitsu') = 'jiu-jitsu' THEN 'branca'
    ELSE 'branco'
  END AS belt,
  CASE
    WHEN COALESCE(p.sport, 'jiu-jitsu') = 'jiu-jitsu' THEN COALESCE(p.degree, 0)
    ELSE 0
  END AS degree,
  COALESCE(p.created_at, now()) AS created_at
FROM public.profiles p
WHERE p.role = 'aluno'
  AND p.academy_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.student_sports ss
    WHERE ss.student_id = p.id
      AND ss.sport = CASE
        WHEN p.sport = ANY (ARRAY['jiu-jitsu'::text, 'muay-thai'::text, 'boxe'::text])
          THEN p.sport
        ELSE 'jiu-jitsu'::text
      END
  );

-- Histórico inicial (exceto boxe) para quem ainda não tem belt_history no esporte
INSERT INTO public.belt_history (
  student_id,
  academy_id,
  belt,
  degree,
  sport,
  graded_at,
  notes,
  trainings_at_graduation
)
SELECT
  ss.student_id,
  ss.academy_id,
  ss.belt,
  ss.degree,
  ss.sport,
  COALESCE(ss.created_at, now()),
  'Graduação de cadastro inicial (backfill)',
  0
FROM public.student_sports ss
WHERE ss.sport <> 'boxe'
  AND ss.belt IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.belt_history bh
    WHERE bh.student_id = ss.student_id
      AND bh.sport = ss.sport
  );
