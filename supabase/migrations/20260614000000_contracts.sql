-- Tabela de contratos
create table if not exists contracts (
  id          uuid primary key default gen_random_uuid(),
  academy_id  uuid not null references academies(id) on delete cascade,
  title       text not null,
  description text,
  file_url    text not null,       -- path no bucket 'contracts' do Storage
  file_type   text not null check (file_type in ('pdf', 'docx')),
  created_by  uuid not null references profiles(id),
  created_at  timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active   boolean not null default true
);

-- Tabela de assinaturas de contratos
create table if not exists contract_signatures (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references contracts(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  academy_id    uuid not null references academies(id) on delete cascade,
  signature_url text not null,       -- path no bucket 'signatures' do Storage
  photo_url     text not null,       -- path no bucket 'signatures' do Storage
  ip_address    text not null default 'unknown',
  signed_at     timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (contract_id, student_id)
);

-- RLS
alter table contracts enable row level security;
alter table contract_signatures enable row level security;

-- Políticas contracts:
-- Admin/professor da academia podem ver e criar
create policy "Admin vê contratos da academia"
  on contracts for select
  using (academy_id = (select academy_id from profiles where id = auth.uid()));

create policy "Admin cria contratos"
  on contracts for insert
  with check (
    academy_id = (select academy_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('admin', 'professor')
  );

create policy "Admin atualiza contratos"
  on contracts for update
  using (academy_id = (select academy_id from profiles where id = auth.uid()));

-- Políticas contract_signatures:
create policy "Ver assinaturas da academia"
  on contract_signatures for select
  using (academy_id = (select academy_id from profiles where id = auth.uid()));

create policy "Aluno assina contrato"
  on contract_signatures for insert
  with check (
    student_id = auth.uid()
    and academy_id = (select academy_id from profiles where id = auth.uid())
  );
