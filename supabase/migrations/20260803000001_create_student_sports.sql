-- Multi-sport: tabela de esportes por aluno (fonte da verdade de faixa/grau)

CREATE TABLE IF NOT EXISTS public.student_sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  sport text NOT NULL,
  belt text,
  degree integer NOT NULL DEFAULT 0,
  belt_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_sports_sport_check
    CHECK (sport = ANY (ARRAY['jiu-jitsu'::text, 'muay-thai'::text, 'boxe'::text])),
  CONSTRAINT student_sports_student_id_sport_key
    UNIQUE (student_id, sport)
);

ALTER TABLE public.student_sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated pode tudo em student_sports"
  ON public.student_sports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.student_sports TO authenticated;
GRANT ALL ON TABLE public.student_sports TO service_role;
