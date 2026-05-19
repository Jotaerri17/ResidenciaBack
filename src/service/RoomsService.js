const prisma = require('../lib/prisma.js')
const { generateRoomCode } =  require('../utils/generateRoomCode.js')
const { calcularDemanda } = require('./DemandaService')
const { calcularRankRound } = require('./RankRoundService')
const { calcularRankFinal } = require('./RankRoundFinal')

async function createRoom({ caixa, juros, totalRounds, quebrasPereciveis,
    quebrasMercearia, quebrasEletro,quebrasHipel,agingEletro,agingHipel,agingMercearia,agingPereciveis, 
     capexSegurancaValor,
  capexBalancaValor,
  capexFreezerValor ,
  capexRedesValor,
  capexSiteValor ,
  capexSelfCheckoutValor,
  capexMelhoriaContinuaValor,
  estoqueDisponivelPereciveis ,
  estoqueDisponivelMercearia ,
  estoqueDisponivelEletro  ,
  estoqueDisponivelHipel  ,
  demandaEstqRounds,
    impostoPereciveis, impostoMercearia, impostoEletro, impostoHipel,custoUntPereciveis, custoUntMercearia,custoUntEletro, custoUntHipel,
    events }) {
  const code = generateRoomCode()
 
  const room = await prisma.room.create({
    data: {
      code,
      caixa:             caixa     ?? 700000,
      juros:             juros     ?? 12,
      totalRounds:       totalRounds       ?? 4,
      quebrasPereciveis: quebrasPereciveis ?? 2,
      quebrasMercearia:  quebrasMercearia  ?? 1.5,
      quebrasEletro:     quebrasEletro     ?? 0,
      quebrasHipel:      quebrasHipel      ?? 1,
      agingEletro:       agingEletro       ?? 1.3,
      agingHipel:        agingHipel        ?? 1.1,
      agingMercearia:    agingMercearia    ?? 0.8,
      agingPereciveis:   agingPereciveis   ?? 5.8,
      impostoPereciveis: impostoPereciveis ?? 12,
      impostoMercearia:  impostoMercearia  ?? 7,
      impostoEletro:     impostoEletro     ?? 25,
      impostoHipel:      impostoHipel      ?? 17,
      custoUntPereciveis: custoUntPereciveis ,
      custoUntMercearia:  custoUntMercearia ,
      custoUntEletro:    custoUntEletro     ,   
      custoUntHipel:    custoUntHipel    ,   
      demandaEstqRounds: demandaEstqRounds,
       capexSegurancaValor: capexSegurancaValor,
  capexBalancaValor: capexBalancaValor,
  capexFreezerValor: capexFreezerValor ,
  capexRedesValor: capexRedesValor,
  capexSiteValor: capexSiteValor ,
  capexSelfCheckoutValor: capexSelfCheckoutValor,
  capexMelhoriaContinuaValor: capexMelhoriaContinuaValor,  
  estoqueDisponivelPereciveis: estoqueDisponivelPereciveis ?? 1000,
  estoqueDisponivelMercearia: estoqueDisponivelMercearia ?? 1000,
  estoqueDisponivelEletro: estoqueDisponivelEletro ?? 1000,
  estoqueDisponivelHipel: estoqueDisponivelHipel ?? 1000,
      events: {
        create: events?.map(({ round, type, description }) => ({
          round,
          type,
          description,
        })) ?? [],
      },
    },
    include: {
      events: true,
    },
  })

  return room
}
async function getRoomByCode(code) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      events: true,
      companies: true,
    },
  })

  return room
}
async function cancelRoom({ code, facilitatorToken}, io) {
  const room = await prisma.room.findUnique({
    where: { code },
  })

  if (!room) {
    throw new Error('ROOM_NOT_FOUND')
  }

  if (room.facilitatorToken !== facilitatorToken) {
    throw new Error('UNAUTHORIZED')
  }

  if (room.status === 'CANCELLED') {
    throw new Error('ROOM_ALREADY_CANCELLED')
  }
  io.to(code).emit('room_cancelled')
  const updatedRoom = await prisma.room.update({
    where: { code },
    data: { status: 'CANCELLED' },
  })


  return updatedRoom
}

async function startRoom({ code, facilitatorToken }, io) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { companies: true }
  })

  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.facilitatorToken !== facilitatorToken)
    throw new Error('UNAUTHORIZED')
  if (room.status !== 'WAITING')
    throw new Error('ROOM_NOT_WAITING')
  if (room.companies.length === 0)
    throw new Error('NO_COMPANIES')

  const updatedRoom = await prisma.room.update({
    where: { code },
    data: { status: 'IN_PROGRESS', currentRound: 1 },
  })

  io.to(code).emit('game_started')

  return updatedRoom
}
async function nextRound({ code, facilitatorToken }, io) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { companies: { include: { configs: true } } }
  })

  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.facilitatorToken !== facilitatorToken) throw new Error('UNAUTHORIZED')
  if (room.status !== 'IN_PROGRESS') throw new Error('ROOM_NOT_IN_PROGRESS')
  if (room.currentRound >= room.totalRounds) throw new Error('ROOM_MAX_ROUNDS_REACHED')

  const next = room.currentRound + 1

  const updatedRoom = await prisma.room.update({
    where: { code },
    data: { currentRound: next },
    include: { companies: true }
  })

  const companyStatus = room.companies.map(c => {
    const hasConfig = c.configs.some(cfg => cfg.round === room.currentRound)
    return { companyId: c.id, name: c.name, configurado: hasConfig }
  })

  io.to(code).emit('round_advanced', {
    round: next,
    totalRounds: updatedRoom.totalRounds,
    status: updatedRoom.status,
    companyStatus
  })

  // Rounds 3+: sem nova config das empresas — calcular rank automaticamente
  if (next > 2) {
    try {
      const demanda = await calcularDemanda(code, next)
      const rank = await calcularRankRound(demanda, code, next)
      io.to(code).emit('all_companies_confirmed', { round: next, demanda, rank })
    } catch (err) {
      console.error(`Erro ao calcular rank automático da rodada ${next}:`, err)
    }
  }

  return updatedRoom
}
async function finishGame({ code, facilitatorToken }, io) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      companies: {
        include: {
          RoundResults: true
        }
      }
    }
  })

  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.facilitatorToken !== facilitatorToken) throw new Error('UNAUTHORIZED')
  if (room.status !== 'IN_PROGRESS') throw new Error('ROOM_NOT_IN_PROGRESS')

  const totalRounds = room.currentRound

  const [rankingFinal, updatedRoom] = await Promise.all([
    calcularRankFinal(code),
    prisma.room.update({ where: { code }, data: { status: 'FINISHED' } })
  ])

  const payload = { rankingFinal, totalRounds }

  io.to(code).emit('game_finished', payload)

  return { room: updatedRoom, ...payload }
}

module.exports = {createRoom, getRoomByCode, cancelRoom, startRoom, nextRound, finishGame}