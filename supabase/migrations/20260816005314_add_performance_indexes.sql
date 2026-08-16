CREATE INDEX IF NOT EXISTS idx_financials_academy_status_due_date
  ON public.financials (academy_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_financials_student_due_date
  ON public.financials (student_id, due_date);

CREATE INDEX IF NOT EXISTS idx_financials_status_due_date
  ON public.financials (status, due_date);

CREATE INDEX IF NOT EXISTS idx_attendance_student_academy_present_at
  ON public.attendance (student_id, academy_id, present_at);

CREATE INDEX IF NOT EXISTS idx_attendance_checkin_id
  ON public.attendance (checkin_id);

CREATE INDEX IF NOT EXISTS idx_checkins_academy_checked_in_at
  ON public.checkins (academy_id, checked_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_academy_status_checked_in_at
  ON public.checkins (academy_id, status, checked_in_at);


CREATE INDEX IF NOT EXISTS idx_belt_history_student_sport
  ON public.belt_history (student_id, sport, graded_at);


CREATE INDEX IF NOT EXISTS idx_student_sports_academy_sport
  ON public.student_sports (academy_id, sport);
