# Banco (Supabase)

Os scripts em `migrations/` são rodados **em ordem**, uma vez cada, no painel do Supabase:
**SQL Editor → New query → colar o arquivo inteiro → Run**.

| Arquivo | O que faz |
|---|---|
| `0001_base_usuarios.sql` | tabela `perfis` (nome de cada usuário), cria perfil sozinho ao criar usuário, função de auditoria (`created_by`, `updated_by`...) |
| `0002_produtos.sql` | `produtos`, `faixas_preco` (sem sobreposição) e `variacoes` (cores, acréscimo, estoque); função `preco_unitario(produto, quantidade, variacao)` |
| `0003_seguranca_funcoes.sql` | fixa o `search_path` das funções e bloqueia `criar_perfil` na API (Security Advisor) |
| `0004_salvar_produto.sql` | `salvar_produto(jsonb)`: grava produto + faixas + cores numa operação só (tudo ou nada) |
| `0005_clientes.sql` | `clientes` PF/PJ (CPF/CNPJ único, aceita CNPJ alfanumérico), endereço, cliente de confiança |
| `0006_configuracoes.sql` | `configuracoes` (linha única): regra e percentual do sinal, validade, formas de pagamento, textos das condições, dados da loja |

## Configuração de login (uma vez)

1. **Authentication → Sign In / Providers** (ou *Settings*): desligar **"Allow new users to sign up"**. Assim ninguém de fora cria conta.
2. Na mesma tela, em **Email**, pode desligar **"Confirm email"** (os usuários são criados por nós).
3. **Authentication → Users → Add user → Create new user**: e-mail + senha, marcar **Auto Confirm User**. Criar um para cada pessoa (José, mãe, irmão).
4. Ajustar o nome que aparece no sistema (SQL Editor):

```sql
update public.perfis set nome = 'José' where email = 'email-do-jose@...';
update public.perfis set nome = 'Mãe'  where email = 'email-da-mae@...';
```

## Testes do SQL

Antes de rodar no Supabase, os scripts são testados num Postgres em memória (PGlite):

```bash
cd app && npm test
```

Testes em `app/test/`.
