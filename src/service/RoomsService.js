const prisma = require('../lib/prisma.js')
const { generateRoomCode } =  require('../utils/generateRoomCode.js')

async function createRoom({ caixa, juros, totalRounds, quebrasPereciveis,
    quebrasMercearia, quebrasEletro,quebrasHipel,agingEletro,agingHipel,agingMercearia,agingPereciveis, 
    impostoPereciveis, impostoMercearia, impostoEletro, impostoHipel,custoUntPereciveis, custoUntMercearia,custoUntEletro, custoUntHipel, events }) {
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
      custoUntPereciveis: custoUntPereciveis ?? 0,
      custoUntMercearia:  custoUntMercearia ?? 0,
      custoUntEletro:    custoUntEletro    ?? 0,     
      custoUntHipel:    custoUntHipel     ?? 0,     
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

module.exports = {createRoom, getRoomByCode, cancelRoom}