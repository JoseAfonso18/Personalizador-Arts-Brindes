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
| `0007_orcamentos.sql` | `orcamentos` (ORC-0001, validade, desconto com motivo, frete, sinal auto/forçar/sem, token do link) + `orcamento_itens`; `orcamento_totais()` e view `orcamentos_lista` |
| `0008_salvar_orcamento.sql` | `salvar_orcamento` (tudo ou nada), `renovar_orcamento`, `duplicar_orcamento`, `preco_orcamento` (faixa pela soma das cores) |
| `0009_link_publico.sql` | link público `/o/<token>`: `orcamento_publico`, `aprovar_orcamento_publico`, `registrar_visualizacao`; coluna `visualizado_em` |
| `0010_pedidos.sql` | `pedidos` (PED-0001), `pedido_itens`, `pedido_historico`; pedido criado sozinho ao aprovar o orçamento (loja ou link); view `pedidos_lista` com atrasados |

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

## Avisos esperados do Security Advisor

- **Public/Signed-in can execute SECURITY DEFINER function** em `orcamento_publico`, `aprovar_orcamento_publico` e `registrar_visualizacao`: é intencional — é o link que o cliente abre sem login. As funções só devolvem/alteram o orçamento cujo token (64 caracteres aleatórios) foi informado, não expõem CPF/CNPJ/telefone do cliente e só aprovam orçamento em aberto e dentro da validade (testado em `app/test/link_publico.test.ts`).
- **Leaked Password Protection**: recurso do plano pago.
