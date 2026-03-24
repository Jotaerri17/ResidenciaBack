const prisma = require ('../lib/prisma') 

async function joinRoom({code, name, managerName}) {
    const room = await prisma.room.findUnique({
        where: { code },
    })
    if (!room){
        throw new Error('ROOM_NOT_FOUND')
    }
    if (room.status !== 'WAITING'){
        throw new Error ('ROOM_NOT_AVAILABLE')

    }

    const company = await prisma.company.create({
        data: {
            roomId: room.id,
            name,
            managerName,
            caixa: room.caixa
        }
    })
    return company
}

async function getCompaniesByRoom(code) {
    const room= await prisma.room.findUnique({
        where: { code },
        include: {
            companies:true,
        },
    })
    if (!room){
        throw new Error ('ROOM_NOT_FOUND')
    }   
    return room.companies
}
async function leaveRoom({ companyId }) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!company) {
    throw new Error('COMPANY_NOT_FOUND')
  }

  await prisma.company.delete({
    where: { id: companyId },
  })
}

module.exports = {joinRoom, getCompaniesByRoom, leaveRoom}