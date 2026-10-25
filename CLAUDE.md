# Art's Brindes — Personalizador e Sistema de Gestão

Este repositório tem o Personalizador (raiz, GitHub Pages) e o Sistema de Gestão (em construção em `app/`). O Provador 3D do sistema (`app/public/provador3d/index.html`) é gerado a partir do `index.html` da raiz: depois de mexer no Personalizador, rode `node app/scripts/gerar-provador.mjs`. Plano: `docs/prd-sistema-gestao.md`. Glossário: `CONTEXT.md`. Visual: `docs/DESIGN.md` (tokens em `app/src/index.css`, tema claro/escuro). Converse com o usuário em português.

## Agent skills

### Issue tracker

Issues are tracked in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
