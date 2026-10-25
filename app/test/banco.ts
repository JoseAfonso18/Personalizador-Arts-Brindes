import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'

const MIGRATIONS = path.resolve(__dirname, '../../supabase/migrations')

/** Simula o que o Supabase já tem pronto: schema auth, auth.uid() e os papéis anon/authenticated. */
const STUB_SUPABASE = `
  create schema if not exists extensions;
  create schema if not exists auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth, extensions to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`

export const USUARIO = '11111111-1111-1111-1111-111111111111'

/** Banco novo em memória com todas as migrations aplicadas, em ordem. */
export async function criarBanco() {
  const db = new PGlite({ extensions: { btree_gist } })
  await db.exec(STUB_SUPABASE)
  for (const arq of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(MIGRATIONS, arq), 'utf8'))
  }
  await db.exec(`insert into auth.users (id, email) values ('${USUARIO}', 'jose@arts.com')`)
  return db
}

/** Roda como um usuário logado (RLS ligado), como o app faz. */
export async function comoUsuario<T>(db: PGlite, fn: () => Promise<T>, uid = USUARIO) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
  }
}
