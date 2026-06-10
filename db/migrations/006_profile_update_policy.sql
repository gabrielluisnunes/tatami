-- Permite que alunos atualizem o próprio profile (photo_url e face_descriptor no primeiro login)
CREATE POLICY "Aluno pode atualizar próprio profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
