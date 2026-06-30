const prisma = require('../lib/prisma')
const { calcularDemanda } = require('./DemandaService')
const {calcularRankRound} = require ('./RankRoundService')

const ALLOWED_CONFIG_FIELDS = [
  'estoquePereciveis',
  'estoqueMercearia',
  'estoqueEletro',
  'estoqueHipel',
  'margemPereciveis',
  'margemMercearia',
  'margemEletro',
  'margemHipel',
  'operadoresVenda',
  'operadoresServico',
  'capexSeguranca',
  'capexBalanca',
  'capexRedes',
  'capexSite',
  'capexSelfCheckout',
  'capexMelhoriaContinua',
]

function sanitizeConfigData(configData) {
  return ALLOWED_CONFIG_FIELDS.reduce((acc, key) => {
    if (configData[key] !== undefined) {
      acc[key] = configData[key]
    }
    return acc
  }, {})
}

async function saveConfig({ companyId, ...configData }, io) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { room: true },
  })

  if (!company) {
    throw new Error('COMPANY_NOT_FOUND')
  }

  if (company.room.status !== 'IN_PROGRESS' || company.room.currentRound <= 0) {
    throw new Error('GAME_NOT_STARTED')
  }

  // Validação anti-dinheiro-infinito: estoques devem ser números não-negativos
  const camposEstoque = ['estoquePereciveis', 'estoqueMercearia', 'estoqueEletro', 'estoqueHipel']
  for (const campo of camposEstoque) {
    const val = configData[campo] ?? 0
    if (typeof val !== 'number' || isNaN(val) || val < 0) {
      throw new Error('INVALID_STOCK')
    }
  }

  // Margens devem ser números válidos
  const camposMargens = ['margemPereciveis', 'margemMercearia', 'margemEletro', 'margemHipel']
  for (const campo of camposMargens) {
    const val = configData[campo] ?? 0
    if (typeof val !== 'number' || isNaN(val) || val < 0) {
      throw new Error('INVALID_MARGIN')
    }
  }

  const round = company.room.currentRound
  const room = company.room

  const existingConfig = await prisma.companyConfig.findUnique({
    where: { companyId_round: { companyId, round } },
  })

  if (existingConfig) {
    throw new Error('ALREADY_CONFIGURED')
  }

  // Débito do caixa
  const capexCatalog = {
    capexSeguranca: room.capexSegurancaValor,
    capexBalanca: room.capexBalancaValor,
    capexRedes: room.capexRedesValor,
    capexSite: room.capexSiteValor,
    capexSelfCheckout: room.capexSelfCheckoutValor,
    capexMelhoriaContinua: room.capexMelhoriaContinuaValor,
  }

  const totalCapex = Object.entries(capexCatalog).reduce((sum, [key, valor]) => {
    return sum + (configData[key] ? valor : 0)
  }, 0)

  const custoEstoque =
    (configData.estoquePereciveis || 0) * room.custoUntPereciveis +
    (configData.estoqueMercearia || 0) * room.custoUntMercearia +
    (configData.estoqueEletro || 0) * room.custoUntEletro +
    (configData.estoqueHipel || 0) * room.custoUntHipel

  const custoPessoal =
    ((configData.operadoresVenda || 0) + (configData.operadoresServico || 0)) * 3000

  // Custos de licenciamento/manutenção recorrentes por rodada
  // Baseados em CAPEX adquirido em qualquer rodada anterior OU na rodada atual
  const previousConfigs = await prisma.companyConfig.findMany({
    where: { companyId, round: { lt: round } },
  })

  // Validação do limite de estoque disponível por empresa
  const prevCompradoPereciveis = previousConfigs.reduce((s, c) => s + (c.estoquePereciveis || 0), 0)
  const prevCompradoMercearia  = previousConfigs.reduce((s, c) => s + (c.estoqueMercearia  || 0), 0)
  const prevCompradoEletro     = previousConfigs.reduce((s, c) => s + (c.estoqueEletro     || 0), 0)
  const prevCompradoHipel      = previousConfigs.reduce((s, c) => s + (c.estoqueHipel      || 0), 0)

  const novaCompraPereciveis = configData.estoquePereciveis || 0
  const novaCompraMercearia  = configData.estoqueMercearia  || 0
  const novaCompraEletro     = configData.estoqueEletro     || 0
  const novaCompraHipel      = configData.estoqueHipel      || 0

  if (prevCompradoPereciveis + novaCompraPereciveis > room.estoqueDisponivelPereciveis ||
      prevCompradoMercearia  + novaCompraMercearia  > room.estoqueDisponivelMercearia  ||
      prevCompradoEletro     + novaCompraEletro     > room.estoqueDisponivelEletro     ||
      prevCompradoHipel      + novaCompraHipel      > room.estoqueDisponivelHipel) {
    throw new Error('STOCK_LIMIT_EXCEEDED')
  }

  const ownsCapex = (field) => !!configData[field] || previousConfigs.some(c => c[field])

  let custoLicencas = 0
  if (ownsCapex('capexSeguranca'))    custoLicencas += 100   // 20% × R$500
  if (ownsCapex('capexSite'))         custoLicencas += 150   // 30% × R$500
  if (ownsCapex('capexSelfCheckout')) custoLicencas += 320   // 4 × R$80
  if (!ownsCapex('capexBalanca'))     custoLicencas += 400   // manutenção se não tiver Balança/Freezer

  const totalGastos = totalCapex + custoEstoque + custoPessoal + custoLicencas

  const excedente = Math.max(0, totalGastos - company.caixa)
  const jurosAplicado = excedente * (room.juros / 100)

  const [config, updatedCompany] = await prisma.$transaction([
    prisma.companyConfig.create({
      data: { companyId, round, ...sanitizeConfigData(configData) },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: { caixa: company.caixa - totalGastos - jurosAplicado },
    }),
  ])

  const [totalEmpresas, totalConfiguradas] = await Promise.all([
    prisma.company.count({ where: { roomId: company.roomId } }),
    prisma.companyConfig.count({ where: { round, company: { roomId: company.roomId } } }),
  ])

  io.to(room.code).emit('company_config_saved', {
    companyId,
    round,
    confirmadas: totalConfiguradas,
    total: totalEmpresas,
    caixa: updatedCompany.caixa,
    totalGastos,
    jurosAplicado,
  })

  if (totalConfiguradas === totalEmpresas) {
    try{
      // Verificar se o RoundResult já foi calculado para evitar double-dispatch
      // em race conditions (múltiplas empresas confirmando simultaneamente)
      const existingResult = await prisma.roundResult.findFirst({
        where: { round, company: { roomId: company.roomId } }
      })
      if (!existingResult) {
        const demanda = await calcularDemanda(room.code, round) 
        const rank = await calcularRankRound(demanda, room.code, round)
        io.to(room.code).emit('all_companies_confirmed', { round, demanda, rank })
      }
    }catch (err){
      console.error('erro ao calcular rank' ,err)
    }
  }

  const estoqueDisponivelRestante = {
    pereciveis: room.estoqueDisponivelPereciveis - (prevCompradoPereciveis + novaCompraPereciveis),
    mercearia:  room.estoqueDisponivelMercearia  - (prevCompradoMercearia  + novaCompraMercearia),
    eletro:     room.estoqueDisponivelEletro     - (prevCompradoEletro     + novaCompraEletro),
    hipel:      room.estoqueDisponivelHipel      - (prevCompradoHipel      + novaCompraHipel),
  }

  return { config, round, caixa: updatedCompany.caixa, totalGastos, jurosAplicado, estoqueDisponivelRestante }
}

module.exports = { saveConfig }
