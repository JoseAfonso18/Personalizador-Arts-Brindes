-- 0006 — Configurações da loja (uma linha só)
create table if not exists public.configuracoes (
  id boolean primary key default true check (id), -- garante linha única
  -- Sinal: pedido quando a quantidade OU o valor passam do mínimo
  sinal_percentual numeric(5, 2) not null default 50 check (sinal_percentual > 0 and sinal_percentual <= 100),
  sinal_valor_minimo numeric(10, 2) check (sinal_valor_minimo is null or sinal_valor_minimo >= 0),
  sinal_qtd_minima integer check (sinal_qtd_minima is null or sinal_qtd_minima >= 1),
  -- Orçamento
  validade_dias integer not null default 7 check (validade_dias between 1 and 365),
  formas_pagamento text not null default 'Pix, boleto ou cartão',
  texto_com_sinal text not null default 'Por ser um produto personalizado, a produção inicia mediante entrada de {percentual} ({valor_sinal}). O restante ({valor_restante}) é pago na entrega. Formas de pagamento: {formas}. Orçamento válido por {validade} dias.',
  texto_sem_sinal text not null default 'Pagamento na entrega. Formas de pagamento: {formas}. Orçamento válido por {validade} dias.',
  -- Dados da loja (PDF e link do orçamento)
  loja_nome text not null default 'Art''s Brindes',
  loja_cnpj text,
  loja_whatsapp text,
  loja_telefone text,
  loja_email text,
  loja_instagram text,
  loja_endereco text,
  loja_cidade text default 'Pitanga - PR',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

insert into public.configuracoes (id, sinal_valor_minimo, sinal_qtd_minima)
values (true, 1000, 50)
on conflict (id) do nothing;

drop trigger if exists auditoria on public.configuracoes;
create trigger auditoria before insert or update on public.configuracoes
  for each row execute function public.preencher_auditoria();

-- Logados leem e editam; ninguém cria outra linha nem apaga
alter table public.configuracoes enable row level security;
drop policy if exists "logados: ler" on public.configuracoes;
create policy "logados: ler" on public.configuracoes for select to authenticated using (true);
drop policy if exists "logados: editar" on public.configuracoes;
create policy "logados: editar" on public.configuracoes for update to authenticated using (true) with check (true);
