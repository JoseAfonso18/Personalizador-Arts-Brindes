-- 0005 — Clientes (pessoa física ou jurídica)
-- cpf_cnpj guardado só com dígitos/letras, sem pontuação. CNPJ aceita o formato
-- alfanumérico novo da Receita (12 letras/números + 2 dígitos verificadores).
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'pf' check (tipo in ('pf', 'pj')),
  nome text not null check (length(trim(nome)) > 0), -- PF: nome · PJ: razão social
  nome_fantasia text,
  cpf_cnpj text,
  celular text,
  telefone text,
  email text,
  cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  confianca boolean not null default false, -- libera fiado
  observacao text,
  ativo boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  constraint clientes_documento_formato check (
    cpf_cnpj is null
    or (tipo = 'pf' and cpf_cnpj ~ '^[0-9]{11}$')
    or (tipo = 'pj' and cpf_cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$')
  )
);

-- O mesmo CPF/CNPJ não pode ser cadastrado duas vezes
create unique index if not exists clientes_cpf_cnpj_unico on public.clientes (cpf_cnpj) where cpf_cnpj is not null;
create index if not exists clientes_nome on public.clientes (lower(nome));

drop trigger if exists auditoria on public.clientes;
create trigger auditoria before insert or update on public.clientes
  for each row execute function public.preencher_auditoria();

alter table public.clientes enable row level security;
drop policy if exists "logados: tudo" on public.clientes;
create policy "logados: tudo" on public.clientes for all to authenticated using (true) with check (true);
