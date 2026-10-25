-- 0003 — Ajustes de segurança apontados pelo Security Advisor do Supabase
-- 1) Fixar o search_path das funções (evita que alguém troque o schema usado por elas)
alter function public.preencher_auditoria() set search_path = public;
alter function public.variacao_so_em_produto() set search_path = public;
alter function public.preco_unitario(uuid, integer, uuid) set search_path = public;
alter function public.criar_perfil() set search_path = public;

-- 2) criar_perfil só deve rodar como gatilho, nunca chamada pela API
revoke execute on function public.criar_perfil() from public, anon, authenticated;
