-- View: resumo financeiro por academia
CREATE OR REPLACE VIEW public.v_financial_dashboard AS
SELECT 
  academy_id,
  COUNT(*)            FILTER (WHERE status = 'paid')    AS paid_count,
  COUNT(*)            FILTER (WHERE status = 'overdue') AS overdue_count,
  COUNT(*)            FILTER (WHERE status = 'pending') AS pending_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'paid'),    0) AS paid_total,
  COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0) AS overdue_total,
  COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_total
FROM public.financials 
GROUP BY academy_id;

-- View: treinos desde a última graduação por aluno
CREATE OR REPLACE VIEW public.v_trainings_since_belt AS
SELECT 
  p.id              AS student_id,
  p.full_name,      
  p.belt,
  p.belt_updated_at,
  p.academy_id,
  COUNT(a.id)       AS trainings_since_belt
FROM public.profiles p 
LEFT JOIN public.attendance a
  ON  a.student_id = p.id
  AND a.present_at > COALESCE(p.belt_updated_at, p.created_at)
WHERE p.role = 'aluno'
GROUP BY p.id, p.full_name, p.belt, p.belt_updated_at, p.academy_id;

-- Ajusta o proprietário para service_role para que as consultas herdem privilégios elevados e ignorem o RLS das tabelas base
ALTER VIEW public.v_financial_dashboard OWNER TO service_role;
ALTER VIEW public.v_trainings_since_belt OWNER TO service_role;
