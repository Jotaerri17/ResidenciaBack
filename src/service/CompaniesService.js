const prisma = require('../lib/prisma')

async function joinRoom({ code, name, managerName }, io) {
  const room = await prisma.room.findUnique({
    where: { code },
  })

  if (!room) {
    throw new Error('ROOM_NOT_FOUND')
  }

  if (room.status !== 'WAITING') {
    throw new Error('ROOM_NOT_AVAILABLE')
  }

  const company = await prisma.company.create({
    data: {
      roomId: room.id,
      name,
      managerName,
      caixa: room.caixa,
    },
  })

  // busca todas as empresas atualizadas da sala
  const companies = await prisma.company.findMany({
    where: { roomId: room.id },
  })

  // emite para todos na sala
  io.to(code).emit('companies_updated', companies)

  return company
}

async function getCompaniesByRoom(code) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { companies: true },
  })

  if (!room) {
    throw new Error('ROOM_NOT_FOUND')
  }

  return room.companies
}

async function leaveRoom({ companyId }, io) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { room: true },
  })

  if (!company) {
    throw new Error('COMPANY_NOT_FOUND')
  }

  await prisma.company.delete({
    where: { id: companyId },
  })

  // busca empresas restantes
  const companies = await prisma.company.findMany({
    where: { roomId: company.roomId },
  })

  // emite para todos na sala
  io.to(company.room.code).emit('companies_updated', companies)
}

module.exports = { joinRoom, getCompaniesByRoom, leaveRoom }