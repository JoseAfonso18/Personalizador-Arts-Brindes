# Glossário — Sistema de Gestão Art's Brindes

Termos do domínio como a equipe usa. Use estes nomes no código, nas issues e nas telas.

## Pessoas

- **Usuário**: quem acessa o sistema (José, a mãe, o irmão do meio). Todos veem tudo; toda ação registra quem fez.
- **Cliente**: quem compra. Pode ser **PF** (CPF, nome) ou **PJ** (CNPJ, razão social, nome fantasia). CNPJ preenche dados pela BrasilAPI; CEP preenche endereço pelo ViaCEP.
- **Cliente de confiança**: marca no cliente que libera **fiado**.
- **Consumidor**: cliente genérico da **venda rápida** quando ninguém é identificado.
- **Fornecedor**: de quem compramos produtos ou insumos.
- **Terceiro**: quem presta serviço no boné fora da loja (bordado, prensa, silk), geralmente em Apucarana.

## Catálogo

- **Produto**: o que vendemos (ex.: Copo Stanley 473 ml). Tem a **tabela de preço por faixa**.
- **Faixa de preço**: preço unitário por intervalo de quantidade (1–9, 10–49, 50+). Quanto mais unidades, menor o preço.
- **Variação**: a cor (ou modelo) de um produto. Tem estoque próprio e um **acréscimo** opcional (ex.: preto e azul-petróleo mais caros).
- **Serviço de gravação**: produto sem estoque, usado quando o **cliente traz o item**. Tem faixas de preço próprias.
- **Item do cliente**: marca no item do pedido indicando que o objeto foi trazido pelo cliente.
- **Adicional**: valor extra opcional por personalização (ex.: 2ª face). Desligado por padrão.

## Venda

- **Orçamento**: proposta numerada (ORC-0001) com validade (padrão 7 dias). Estados: rascunho → enviado → aprovado | expirado | recusado. Pode ser **renovado** (preços atualizados).
- **Link do orçamento**: página pública somente leitura com itens, valores, condições e mockup 3D, com botão **Aprovar**.
- **Mockup**: personalização montada no **Provador 3D** e amarrada a um item do orçamento.
- **Desconto**: abatimento em R$ ou %, sempre com **motivo**.
- **Frete**: linha do orçamento; repassado ao cliente ou absorvido (vira custo do pedido).
- **Sinal**: entrada exigida antes de produzir. Percentual padrão 50%. Exigido quando o orçamento atinge a **regra do sinal** (padrão: 50 un ou R$ 1.000). Tudo configurável, e ajustável em cada orçamento.
- **Condições de pagamento**: texto gerado no orçamento a partir de um modelo editável, com os valores do sinal e do restante.
- **Pedido**: nasce da aprovação de um orçamento. Brinde: aprovado → gravando → pronto → entregue → pago.
- **Venda rápida**: venda de balcão sem orçamento; baixa estoque e lança no caixa na hora.
- **Repetir pedido**: cria um orçamento novo a partir de um pedido antigo, com a mesma arte e preços atuais.
- **Anexo**: arquivo do pedido (logo do cliente, SVG, arquivo do EzCad).
- **Fiado**: venda a prazo para cliente de confiança, com data de vencimento.

## Estoque e compras

- **Nota de compra**: entrada de mercadoria/insumo, importada do XML da NF-e ou digitada à mão. Alimenta estoque e custo.
- **Nota de venda**: emitida fora do sistema (portal do MEI); o sistema guarda só o número.
- **Custo médio**: custo unitário de cada variação, recalculado a cada entrada.
- **Estoque mínimo**: limite por variação que dispara o alerta de estoque baixo.

## Financeiro

- **Conta**: onde o dinheiro fica (Pix/Banco, Dinheiro).
- **Lançamento**: entrada ou saída de dinheiro numa conta.
- **Despesa fixa**: despesa recorrente lançada todo mês (aluguel, luz, internet, DAS do MEI).
- **Pró-labore**: retirada pessoal dos donos. Nunca misturar com despesa da empresa.

## Bonés (etapa 5)

- **Insumo**: matéria-prima do boné (tecido, aba, carneira, viés, botão, fio, etiqueta). Tem **unidade de compra** (rolo, peça, pacote, cone) e **unidade de consumo** (metro, unidade), com um fator de conversão.
- **Ficha técnica**: consumo de cada insumo para **1 boné** de um modelo, mais o **% de perda** de cada insumo.
- **Perda**: margem de sobra/erro somada ao consumo na baixa (ex.: tecido 15%, botão 3%).
- **Lote**: produção de N bonés de um modelo. A baixa dos insumos acontece no **corte**. Estados: corte → costura → em terceiro → retorno → acabamento → entregue.
- **Conferência**: contagem real do estoque de insumos; a diferença sugere ajuste do % de perda.
- **Remessa**: bonés enviados a um terceiro, com data de envio e previsão de retorno.
- **Transporte**: deslocamento ou frete de compras/remessas (carro próprio com valor por km, transportadora, entrega do fornecedor). Seu custo é **rateado** entre os bonés.
- **Imprevisto**: gasto inesperado no transporte (pneu, conserto). Entra no financeiro do mês, **fora** do rateio do custo do boné.
- **Custo + margem**: forma de sugerir o preço do boné a partir do custo real (ficha técnica + terceiros + transporte).
