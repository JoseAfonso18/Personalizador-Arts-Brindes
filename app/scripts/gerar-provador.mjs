// Gera app/public/provador3d/index.html a partir do Personalizador da raiz (index.html).
// O original continua no GitHub Pages; a cópia ganha o modo "embed" usado dentro do sistema:
//   ?embed=1&modo=editar&produto=copo&cor=Preto&texto=Maria   (abre já com produto/cor/texto)
//   ?embed=1&modo=editar#p=...                                (abre um mockup salvo para mexer)
//   ?embed=1&modo=ver#p=...                                   (só girar, sem controles)
// Ao salvar, manda para a janela do sistema: { tipo: 'arts-mockup', hash, titulo, desc, produto, cor }.
// Rodar de novo sempre que mudar o index.html da raiz:  node scripts/gerar-provador.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const origem = resolve(aqui, '../../index.html')
const destino = resolve(aqui, '../public/provador3d/index.html')

let html = readFileSync(origem, 'utf8')

function trocar(de, para) {
  const n = html.split(de).length - 1
  if (n !== 1) throw new Error(`Esperava achar 1 vez (achei ${n}): ${de.slice(0, 80)}`)
  html = html.replace(de, para)
}

// Cabeçalho: sem manifest/ícones do app antigo (o sistema já é o app instalado)
trocar('<link rel="manifest" href="manifest.json">\n', '')
trocar('<link rel="icon" type="image/png" href="icon-192.png">', '<link rel="icon" type="image/svg+xml" href="/favicon.svg">')
trocar('<link rel="apple-touch-icon" href="apple-touch-icon.png">\n', '')

// CSS do modo embed
trocar(
  '@media (prefers-reduced-motion: reduce) { .bar i { transition: none; } }',
  `@media (prefers-reduced-motion: reduce) { .bar i { transition: none; } }
/* ---- dentro do sistema de gestão ---- */
body.embed #installBtn, body.embed #installHelp, body.embed .foot { display: none !important; }
body.embed .top { display: none !important; }
body.embed-editar .proj, body.embed-editar .order-actions, body.embed-editar .order, body.embed-editar .share { display: none !important; }
body.embed-editar { padding-bottom: 84px; }
body.embed-ver .viewer-card, body.embed-ver .views { display: none !important; }
body.embed-ver { padding: 0 !important; overflow: hidden; }
body.embed-ver .layout { max-width: none; padding: 0; margin: 0; }
body.embed-ver .stage-wrap { margin: 0; padding: 0; }
body.embed-ver .stage { height: 100svh !important; border-radius: 0; }
.embed-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; display: flex; gap: 10px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); background: var(--surface); border-top: 1px solid var(--line); }
.embed-bar button { flex: 1; height: 48px; border-radius: 12px; font-weight: 800; font-size: 15px; border: 1px solid var(--line); background: var(--raised); color: var(--fg); }
.embed-bar button.main { flex: 2; background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }`,
)

// Barra "Salvar no orçamento" (só aparece no modo editar)
trocar(
  '<script type="importmap">',
  `<div class="embed-bar" id="embedBar" hidden>
  <button type="button" id="embedCancel">Cancelar</button>
  <button type="button" class="main" id="embedSave">Salvar mockup</button>
</div>

<script type="importmap">`,
)

// Leitura do modo logo no começo do script
trocar(
  "/* ---------- dados (exemplo) ---------- */",
  `/* ---------- modo dentro do sistema ---------- */
const QS = new URLSearchParams(location.search);
const EMBED = QS.get('embed') === '1';
const MODO = QS.get('modo') === 'ver' ? 'ver' : 'editar';
if (EMBED) document.body.classList.add('embed', 'embed-' + MODO);

/* ---------- dados (exemplo) ---------- */`,
)

// Não salva no aparelho quando está dentro do sistema
trocar(
  "if (restoring || document.body.classList.contains('viewer')) return;",
  "if (restoring || EMBED || document.body.classList.contains('viewer')) return;",
)

// Inicialização
trocar(
  'if (shared && shared.length) { enterViewer(shared); resize(); showViewerItem(0); }\nelse {',
  `if (EMBED && MODO === 'editar') {
  let cfg = shared && shared.length ? shared[0] : null;
  if (!cfg) {
    const prod = QS.get('produto'), cor = (QS.get('cor') || '').trim().toLowerCase(), texto = QS.get('texto');
    cfg = snapshot();
    if (PRODUCTS.some((p) => p.id === prod)) cfg.product = prod;
    const c = COLORS.find((k) => k.name.toLowerCase() === cor);
    if (c) cfg.color = { ...c };
    if (texto != null) { cfg.line1 = texto; cfg.line2 = ''; }
  }
  applyConfig(cfg);
  setView(0, null, true);
  $('embedBar').hidden = false;
  const avisar = (msg) => { if (window.parent !== window) window.parent.postMessage(msg, location.origin); };
  $('embedSave').addEventListener('click', async () => {
    const b = $('embedSave'); b.disabled = true; b.textContent = 'Salvando…';
    try {
      const url = await buildShareUrl();
      const s = snapshot(), d = describe(s);
      avisar({ tipo: 'arts-mockup', hash: url.slice(url.indexOf('#')), titulo: d.title, desc: d.desc, produto: s.product, cor: s.color.name });
    } finally { b.disabled = false; b.textContent = 'Salvar mockup'; }
  });
  $('embedCancel').addEventListener('click', () => avisar({ tipo: 'arts-mockup-cancelar' }));
}
else if (shared && shared.length) { enterViewer(shared); resize(); showViewerItem(0); }
else {`,
)

// Sem service worker / botão instalar do app antigo
const i = html.lastIndexOf('<script>\nif (\'serviceWorker\' in navigator)')
if (i === -1) throw new Error('Não achei o script do service worker')
html = html.slice(0, i) + html.slice(html.indexOf('</script>', i) + '</script>'.length)

mkdirSync(dirname(destino), { recursive: true })
writeFileSync(destino, html.replace('<!doctype html>\n', '<!doctype html>\n<!-- Gerado por app/scripts/gerar-provador.mjs a partir do index.html da raiz. Não edite aqui. -->\n'))
console.log('ok:', destino)
