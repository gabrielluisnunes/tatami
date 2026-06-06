-- face-api.js gera vetor de 128 floats para reconhecimento facial
-- A coluna rekognition_face_id é mantida para futura migração ao AWS

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS face_descriptor float8[];
