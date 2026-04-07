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

  const totalGastos = totalCapex + custoEstoque + custoPessoal

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
      const demanda = await calcularDemanda(room.code, round) 
      const rank = await calcularRankRound(demanda, room.code, round)
      io.to(room.code).emit('all_companies_confirmed', { round, demanda,rank  })
    }catch (err){
      console.error('erro ao calcular rank' ,err)
    }
  }

  return { config, round, caixa: updatedCompany.caixa, totalGastos, jurosAplicado }
}

module.exports = { saveConfig }
