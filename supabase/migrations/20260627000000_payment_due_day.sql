-- Adiciona dia de vencimento individual por aluno
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_due_day integer
  CHECK (payment_due_day >= 1 AND payment_due_day <= 31);

-- Garante estrutura mínima da tabela financials para ambientes novos
CREATE TABLE IF NOT EXISTS financials (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid        NOT NULL REFERENCES profiles(id),
  academy_id uuid        NOT NULL REFERENCES academies(id),
  amount     numeric     NOT NULL,
  due_date   date        NOT NULL,
  paid_at    timestamptz,
  status     text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at timestamptz NOT NULL DEFAULT now()
);
