const prisma = require('../lib/prisma.js')
const { generateRoomCode } =  require('../utils/generateRoomCode.js')

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
  // First fetch to read currentRound (needed to filter configs)
  const roomBasic = await prisma.room.findUnique({ where: { code } })

  if (!roomBasic) throw new Error('ROOM_NOT_FOUND')
  if (roomBasic.facilitatorToken !== facilitatorToken) throw new Error('UNAUTHORIZED')
  if (roomBasic.status !== 'IN_PROGRESS') throw new Error('ROOM_NOT_IN_PROGRESS')
  if (roomBasic.currentRound >= roomBasic.totalRounds) throw new Error('ALREADY_LAST_ROUND')

  // Second fetch: include companies with configs for the current round
  const roomWithConfigs = await prisma.room.findUnique({
    where: { code },
    include: {
      companies: {
        include: {
          configs: { where: { round: roomBasic.currentRound } }
        }
      }
    }
  })

  const empresasStatus = roomWithConfigs.companies.map(company => ({
    companyId: company.id,
    companyName: company.name,
    managerName: company.managerName,
    confirmou: company.configs.length > 0
  }))

  const updatedRoom = await prisma.room.update({
    where: { code },
    data: { currentRound: roomWithConfigs.currentRound + 1 }
  })

  io.to(code).emit('round_advanced', {
    previousRound: roomWithConfigs.currentRound,
    currentRound: updatedRoom.currentRound,
    empresasStatus
  })

  return { room: updatedRoom, empresasStatus }
}

async function finishGame({ code, facilitatorToken }, io) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      companies: {
        include: { RoundResults: true }
      }
    }
  })

  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.facilitatorToken !== facilitatorToken) throw new Error('UNAUTHORIZED')
  if (room.status !== 'IN_PROGRESS') throw new Error('ROOM_NOT_IN_PROGRESS')

  await prisma.room.update({
    where: { code },
    data: { status: 'FINISHED' }
  })

  const rankingGeral = room.companies
    .map(company => ({
      companyId: company.id,
      companyName: company.name,
      managerName: company.managerName,
      receitaAcumulada: company.RoundResults.reduce(
        (sum, rr) => sum + rr.receitaTotal, 0
      )
    }))
    .sort((a, b) => b.receitaAcumulada - a.receitaAcumulada)

  const resultadosPorRodada = []
  for (let r = 1; r <= room.totalRounds; r++) {
    const resultadosRound = room.companies
      .flatMap(company =>
        company.RoundResults
          .filter(rr => rr.round === r)
          .map(rr => ({
            companyId: company.id,
            companyName: company.name,
            managerName: company.managerName,
            receitaTotal: rr.receitaTotal
          }))
      )
      .sort((a, b) => b.receitaTotal - a.receitaTotal)

    if (resultadosRound.length === 0) {
      resultadosPorRodada.push({ round: r, vencedor: null, discrepancia: null, resultados: [] })
      continue
    }

    const primeiro = resultadosRound[0]
    const ultimo = resultadosRound[resultadosRound.length - 1]
    const discrepancia = primeiro.receitaTotal > 0
      ? parseFloat(((primeiro.receitaTotal - ultimo.receitaTotal) / primeiro.receitaTotal * 100).toFixed(2))
      : 0

    resultadosPorRodada.push({
      round: r,
      vencedor: { companyId: primeiro.companyId, companyName: primeiro.companyName, receitaTotal: primeiro.receitaTotal },
      discrepancia,
      resultados: resultadosRound
    })
  }

  io.to(code).emit('game_finished', { rankingGeral, resultadosPorRodada })

  return { rankingGeral, resultadosPorRodada }
}

module.exports = { createRoom, getRoomByCode, cancelRoom, startRoom, nextRound, finishGame }