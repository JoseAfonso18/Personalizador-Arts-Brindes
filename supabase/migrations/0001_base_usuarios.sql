-- 0001 — Base: perfis dos usuários e auditoria (quem criou / quem alterou)
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run.

-- Perfil de cada usuário (nome que aparece no sistema: "criado por Mãe")
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text,
  created_at timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Usuários logados veem todos os perfis; cada um só edita o próprio
drop policy if exists "perfis: logados leem" on public.perfis;
create policy "perfis: logados leem" on public.perfis
  for select to authenticated using (true);

drop policy if exists "perfis: editar o proprio" on public.perfis;
create policy "perfis: editar o proprio" on public.perfis
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Cria o perfil sozinho quando um usuário é criado no painel do Supabase
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Perfis para usuários que já existiam antes deste script
insert into public.perfis (id, nome, email)
select id, split_part(email, '@', 1), email from auth.users
on conflict (id) do nothing;

-- Auditoria reutilizável: toda tabela do sistema terá estas 4 colunas
--   created_by uuid, created_at timestamptz, updated_by uuid, updated_at timestamptz
-- e o gatilho abaixo preenche sozinho com o usuário logado.
create or replace function public.preencher_auditoria()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
