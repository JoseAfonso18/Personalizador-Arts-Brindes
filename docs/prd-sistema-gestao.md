# Sistema de Gestão Art's Brindes — Documento do projeto

Decidido em 24/10/2026. Termos definidos em [`CONTEXT.md`](../CONTEXT.md).

## Problema

Orçamentos, pedidos, estoque e dinheiro da Art's Brindes ficam na cabeça e no WhatsApp. Resultado: preço por quantidade varia a cada cliente, pedidos se perdem entre aprovado/gravando/entregue/pago, falta produto na hora de fechar e ninguém sabe se o mês deu lucro.

## Quem usa

José, a mãe e o irmão do meio, cada um com seu login. Sem cadastro público. Todos veem tudo; toda ação registra o autor. Permissões só se entrar funcionário.

## Decisões técnicas

- App web + PWA (instalável no celular), funciona no PC e no celular.
- React + TypeScript + Vite · Tailwind + shadcn/ui · Supabase (PostgreSQL, login, arquivos, regras de acesso) · hospedagem Vercel. Custo R$ 0.
- Web em vez de local: o link do cliente precisa ser público, vários aparelhos usam os mesmos dados e o backup fica na nuvem.
- O Personalizador vira a tela **Provador 3D** dentro do sistema; o código 3D (three.js) é reaproveitado. O link atual do GitHub Pages continua até a migração.
- Nota fiscal de venda **não** é emitida pelo sistema (portal do MEI); só registramos o número.
- Programado em dupla (José + Claude).

## Etapas

### 1. Produtos e clientes — meta dezembro/2026
- Produto com faixas de preço por quantidade.
- Variações (cor) com estoque próprio e acréscimo opcional.
- Serviço de gravação (sem estoque).
- Cliente PF/PJ com campos que mudam conforme o tipo; CNPJ via BrasilAPI; CEP via ViaCEP; marca "cliente de confiança".
- Login dos 3 usuários, menu e configurações básicas.

### 2. Orçamento → pedido — meta dezembro/2026
- Orçamento numerado, validade configurável (7 dias), renovar.
- Desconto com motivo, frete, adicionais opcionais.
- Sinal configurável (percentual, valor mínimo, quantidade mínima), ajustável por orçamento; texto de condições gerado a partir de modelo editável, com botão copiar.
- Provador 3D amarrado ao item; link público com itens, valores, condições, 3D e botão Aprovar (aprovação cria o pedido e avisa a equipe); PDF com logo.
- Quadro de pedidos em colunas: aprovado → gravando → pronto → entregue → pago.
- Pagamentos: Pix, boleto, cartão, fiado (só cliente de confiança, com vencimento); sinal + restante.
- Venda rápida de balcão (inclui gravação na hora).
- Anexos no pedido e "repetir pedido".

### 3. Estoque e compras — janeiro/2027
- Nota de compra por XML da NF-e ou manual; vincula item da nota a um produto (memoriza para as próximas).
- Custo médio por variação; baixa automática pelo pedido; estoque mínimo com alerta.
- Número da nota de venda no pedido.

### 4. Financeiro — janeiro/2027
- Contas (Pix/Banco, Dinheiro), a pagar, a receber, despesas fixas recorrentes com aviso de vencimento.
- Pró-labore separado; relatório de lucro do mês. Sem fechamento diário de caixa.

### 5. Bonés — quando a produção começar
- Insumos com unidade de compra × consumo (rolo → metro).
- Ficha técnica por modelo com % de perda; consumo real calculado a partir do primeiro lote (entrou ÷ bonés que saíram).
- Lote com baixa no corte; conferência periódica que sugere ajuste do % de perda.
- Remessas para terceiros com previsão de retorno.
- Transporte genérico (carro próprio com valor por km configurável, transportadora, fornecedor) rateado entre os bonés; comparação entre tipos; imprevisto fora do rateio.
- Preço sugerido por custo + margem.

## Painel e menu

- **Painel**: a receber (sinais, fiado, vencidos), pedidos em produção com prazo, orçamentos aguardando, estoque baixo, resultado do mês, gráfico de 6 meses, mais vendidos.
- **Menu**: Painel · Orçamentos · Pedidos · Clientes · Produtos · Estoque · Compras · Financeiro · Provador 3D · Configurações. Barra lateral no PC, abas embaixo no celular.

## Fora do escopo

- Emissão de nota fiscal.
- Fechamento diário de caixa.
- Controle de permissões por usuário.
- Funcionamento offline (talvez depois, só consulta).

## Em aberto

- Logística dos bonés (carro da família × transportadora) — não bloqueia, fica na etapa 5.
- Consumo real de insumos — depende da aula/primeiros lotes.
