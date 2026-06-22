-- Migration para adicionar colunas adicionais de controle de assinatura na tabela academies
ALTER TABLE academies ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE academies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
