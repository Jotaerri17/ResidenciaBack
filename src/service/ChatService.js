const Groq = require('groq-sdk')

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

function buildSystemPrompt(roomConfig) {
  const {
    caixa = 700000,
    juros = 12,
    totalRounds = 4,
    quebrasPereciveis = 2,
    quebrasMercearia = 1.5,
    quebrasEletro = 0,
    quebrasHipel = 1,
    agingPereciveis = 5.8,
    agingMercearia = 0.8,
    agingEletro = 1.3,
    agingHipel = 1.1,
    impostoPereciveis = 12,
    impostoMercearia = 7,
    impostoEletro = 25,
    impostoHipel = 17,
    custoUntPereciveis,
    custoUntMercearia,
    custoUntEletro,
    custoUntHipel,
    estoqueDisponivelPereciveis = 1000,
    estoqueDisponivelMercearia = 1000,
    estoqueDisponivelEletro = 1000,
    estoqueDisponivelHipel = 1000,
    capexSegurancaValor,
    capexBalancaValor,
    capexFreezerValor,
    capexRedesValor,
    capexSiteValor,
    capexSelfCheckoutValor,
    capexMelhoriaContinuaValor,
    demandaEstqRounds,
    events = [],
  } = roomConfig

  const capexLinhas = [
    capexSegurancaValor != null ? `  - Segurança: R$ ${capexSegurancaValor.toLocaleString('pt-BR')}` : null,
    capexBalancaValor != null ? `  - Balança/Freezer: R$ ${capexBalancaValor.toLocaleString('pt-BR')}` : null,
    capexFreezerValor != null ? `  - Freezer adicional: R$ ${capexFreezerValor.toLocaleString('pt-BR')}` : null,
    capexRedesValor != null ? `  - Redes: R$ ${capexRedesValor.toLocaleString('pt-BR')}` : null,
    capexSiteValor != null ? `  - Site: R$ ${capexSiteValor.toLocaleString('pt-BR')}` : null,
    capexSelfCheckoutValor != null ? `  - Self-checkout: R$ ${capexSelfCheckoutValor.toLocaleString('pt-BR')}` : null,
    capexMelhoriaContinuaValor != null ? `  - Melhoria Contínua: R$ ${capexMelhoriaContinuaValor.toLocaleString('pt-BR')}` : null,
  ].filter(Boolean).join('\n')

  const eventosLinhas = events.length > 0
    ? events.map(e => `  - Rodada ${e.round}: [${e.type}] ${e.description}`).join('\n')
    : '  Nenhum evento agendado.'

  return `Você é um assistente especializado em auxiliar jogadores a planejar suas configurações em um jogo de simulação de gestão de supermercado.

Seu papel é orientar o jogador a tomar boas decisões de negócio com base nas configurações específicas desta sala de jogo.

## CONFIGURAÇÕES DA SALA

**Parâmetros gerais:**
- Caixa inicial por empresa: R$ ${caixa.toLocaleString('pt-BR')}
- Taxa de juros (sobre saldo devedor): ${juros}%
- Total de rodadas: ${totalRounds}
- Demanda distribuída em ${demandaEstqRounds ?? totalRounds} rodadas de estoque

**Custos unitários de estoque:**
- Perecíveis: R$ ${custoUntPereciveis}/un
- Mercearia: R$ ${custoUntMercearia}/un
- Eletro: R$ ${custoUntEletro}/un
- Higiene/Limpeza (Hipel): R$ ${custoUntHipel}/un

**Estoque disponível total (compartilhado entre todas as empresas):**
- Perecíveis: ${estoqueDisponivelPereciveis} un
- Mercearia: ${estoqueDisponivelMercearia} un
- Eletro: ${estoqueDisponivelEletro} un
- Hipel: ${estoqueDisponivelHipel} un

**Quebras e aging (deterioração/envelhecimento) por categoria:**
- Perecíveis: ${quebrasPereciveis}% quebras | ${agingPereciveis}% aging
- Mercearia: ${quebrasMercearia}% quebras | ${agingMercearia}% aging
- Eletro: ${quebrasEletro}% quebras | ${agingEletro}% aging
- Hipel: ${quebrasHipel}% quebras | ${agingHipel}% aging

**Impostos por categoria:**
- Perecíveis: ${impostoPereciveis}%
- Mercearia: ${impostoMercearia}%
- Eletro: ${impostoEletro}%
- Hipel: ${impostoHipel}%

**CAPEX disponível:**
${capexLinhas || '  Nenhum CAPEX configurado.'}

**Regras de custos recorrentes (por rodada):**
- Segurança (se ativada): R$ 100 de manutenção
- Site (se ativado): R$ 150 de manutenção
- Self-checkout (se ativado): R$ 320 de manutenção
- Sem Balança/Freezer: R$ 400 de penalidade de manutenção

**Custo de pessoal:** R$ 3.000/rodada por operador (vendas ou serviço)

**Eventos agendados:**
${eventosLinhas}

## COMO ORIENTAR O JOGADOR

Ao conversar com o jogador, leve em conta as configurações acima para dar conselhos práticos e específicos sobre:
1. **Estoque**: Quais categorias comprar, em que quantidade, considerando custo, quebras e demanda
2. **Margens**: Como definir margens competitivas mas lucrativas por categoria
3. **Operadores**: Quantos operadores de venda e de serviço contratar, balanceando custo x benefício
4. **CAPEX**: Quais investimentos valem a pena considerando os custos recorrentes e benefícios
5. **Gestão de caixa**: Como não extrapolar o caixa (evitar juros) e planejar rodadas futuras
6. **Eventos**: Alertar sobre eventos previstos e como se preparar

IMPORTANTE: Responda sempre em texto simples, sem markdown. Não use asteriscos, hashtags, underlines, bullets ou qualquer formatação. Use apenas texto corrido e números.

não responda com mensagens muito genéricas ou teóricas.
não responda com mensagens que não levem em conta os números e configurações específicas desta sala.
não responda com mensagens longas demais.
Seja direto, didático e use os números reais da sala nas suas respostas. Quando o jogador perguntar algo genérico, peça mais contexto (ex: qual rodada, quanto caixa ainda tem, etc.).`
}

async function chat({ roomConfig, messages, message }) {
  const systemPrompt = buildSystemPrompt(roomConfig)

  const history = [
    { role: 'system', content: systemPrompt },
    ...(messages || []).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const response = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: history,
    max_tokens: 1024,
  })

  const text = response.choices[0].message.content
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}

module.exports = { chat }
