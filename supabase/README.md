# Banco (Supabase)

Os scripts em `migrations/` são rodados **em ordem**, uma vez cada, no painel do Supabase:
**SQL Editor → New query → colar o arquivo inteiro → Run**.

| Arquivo | O que faz |
|---|---|
| `0001_base_usuarios.sql` | tabela `perfis` (nome de cada usuário), cria perfil sozinho ao criar usuário, função de auditoria (`created_by`, `updated_by`...) |

## Configuração de login (uma vez)

1. **Authentication → Sign In / Providers** (ou *Settings*): desligar **"Allow new users to sign up"**. Assim ninguém de fora cria conta.
2. Na mesma tela, em **Email**, pode desligar **"Confirm email"** (os usuários são criados por nós).
3. **Authentication → Users → Add user → Create new user**: e-mail + senha, marcar **Auto Confirm User**. Criar um para cada pessoa (José, mãe, irmão).
4. Ajustar o nome que aparece no sistema (SQL Editor):

```sql
update public.perfis set nome = 'José' where email = 'email-do-jose@...';
update public.perfis set nome = 'Mãe'  where email = 'email-da-mae@...';
```
