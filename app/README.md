# Art's Brindes — Sistema de Gestão (app)

React + TypeScript + Vite · Tailwind + shadcn/ui · Supabase · PWA. Plano: [`../docs/prd-sistema-gestao.md`](../docs/prd-sistema-gestao.md).

## Rodar no PC

```bash
cd app
npm install
cp .env.example .env.local   # e cole a chave publishable do Supabase
npm run dev                  # abre em http://localhost:5173
```

## Estrutura

```
app/
├── index.html            página base (o React "monta" dentro do <div id="root">)
├── vite.config.ts        Vite: React, Tailwind, PWA e o atalho @ → src/
├── components.json       config do shadcn/ui (npx shadcn@latest add <componente>)
├── vercel.json           faz todas as rotas abrirem o app (necessário para SPA)
├── public/               ícones e arquivos servidos como estão
└── src/
    ├── main.tsx          ponto de entrada
    ├── App.tsx           rotas (login, telas protegidas)
    ├── pages/            uma tela por arquivo (Login, Painel...)
    ├── components/layout menu lateral (PC) e abas (celular)
    ├── lib/auth.tsx      quem está logado (useAuth)
    ├── lib/menu.ts       itens do menu
    ├── index.css         Tailwind + cores e fontes da Art's
    ├── lib/supabase.ts   conexão com o banco
    ├── lib/utils.ts      cn() para juntar classes
    └── components/ui/    componentes shadcn (Button, Card...)
```

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — checa os tipos e gera `dist/`
- `npm run lint` — procura problemas no código
- `npx shadcn@latest add input` — adiciona um componente do shadcn

## Banco

Scripts SQL e passo a passo em [`../supabase/README.md`](../supabase/README.md).

## Deploy

Vercel, com **Root Directory = `app`** e as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Cada push na `main` publica sozinho.
