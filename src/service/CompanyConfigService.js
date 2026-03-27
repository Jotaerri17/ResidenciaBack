const prisma = require('../lib/prisma')

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

  const existingConfig = await prisma.companyConfig.findUnique({
    where: {
      companyId_round: {
        companyId,
        round,
      },
    },
  })

  if (existingConfig) {
    throw new Error('ALREADY_CONFIGURED')
  }

  const config = await prisma.companyConfig.create({
    data: {
      companyId,
      round,
      ...sanitizeConfigData(configData),
    },
  })

  io.to(company.room.code).emit('company_config_saved', {
    companyId,
    round,
  })

  return { config, round }
}

module.exports = { saveConfig }
