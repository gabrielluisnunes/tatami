-- Corrige o trigger handle_new_user para ler role do metadata
-- Permite role=NULL para dono da academia (que define no onboarding)
-- Permite role='aluno' ou 'professor' quando criado via /api/students/enroll

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    academy_id,
    belt,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    (NEW.raw_user_meta_data->>'role')::text,
    (NEW.raw_user_meta_data->>'academy_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'belt', 'branca'),
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
