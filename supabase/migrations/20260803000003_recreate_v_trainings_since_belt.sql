-- Multi-sport: view de treinos desde a última faixa, separada por esporte

DROP VIEW IF EXISTS public.v_trainings_since_belt;

CREATE VIEW public.v_trainings_since_belt AS
SELECT
  ss.student_id,
  p.full_name,
  ss.sport,
  ss.belt,
  ss.degree,
  ss.belt_updated_at,
  ss.academy_id,
  count(a.id) AS trainings_since_belt,
  COALESCE((
    SELECT count(*) AS count
    FROM checkins c
    JOIN classes cl ON cl.id = c.class_id
    WHERE c.academy_id = ss.academy_id
      AND c.status = 'confirmed'::text
      AND cl.sport = ss.sport
      AND c.checked_in_at > COALESCE(ss.belt_updated_at, ss.created_at)
  ), 0::bigint) AS total_classes_since_belt,
  CASE
    WHEN COALESCE((
      SELECT count(*) AS count
      FROM checkins c
      JOIN classes cl ON cl.id = c.class_id
      WHERE c.academy_id = ss.academy_id
        AND c.status = 'confirmed'::text
        AND cl.sport = ss.sport
        AND c.checked_in_at > COALESCE(ss.belt_updated_at, ss.created_at)
    ), 0::bigint) = 0 THEN NULL::numeric
    WHEN count(a.id) = 0 THEN 0.0
    ELSE round(
      count(a.id)::numeric /
      ((
        SELECT count(*) AS count
        FROM checkins c
        JOIN classes cl ON cl.id = c.class_id
        WHERE c.academy_id = ss.academy_id
          AND c.status = 'confirmed'::text
          AND cl.sport = ss.sport
          AND c.checked_in_at > COALESCE(ss.belt_updated_at, ss.created_at)
      ))::numeric * 100::numeric,
      1
    )
  END AS attendance_rate
FROM student_sports ss
JOIN profiles p ON p.id = ss.student_id
LEFT JOIN attendance a ON a.student_id = ss.student_id
  AND a.present_at > COALESCE(ss.belt_updated_at, ss.created_at)
  AND (
    EXISTS (
      SELECT 1
      FROM checkins c
      JOIN classes cl ON cl.id = c.class_id
      WHERE c.id = a.checkin_id
        AND cl.sport = ss.sport
    )
  )
GROUP BY
  ss.student_id,
  ss.sport,
  ss.belt,
  ss.degree,
  ss.belt_updated_at,
  ss.academy_id,
  ss.created_at,
  p.full_name;

GRANT SELECT ON public.v_trainings_since_belt TO authenticated;
GRANT SELECT ON public.v_trainings_since_belt TO service_role;
