const prisma = require('../lib/prisma')

async function saveQuiz({ roomCode, facilitatorToken, totalQuestions, results }, io) {
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: { quiz: true, companies: { select: { id: true } } }
  })

  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.facilitatorToken !== facilitatorToken) throw new Error('UNAUTHORIZED')
  if (room.quiz) throw new Error('QUIZ_ALREADY_EXISTS')

  const roomCompanyIds = new Set(room.companies.map((c) => c.id))
  const companyForasDaSala = results.filter((r) => !roomCompanyIds.has(r.companyId))
  if (companyForasDaSala.length > 0) throw new Error('COMPANY_NOT_IN_ROOM')

  const quiz = await prisma.quiz.create({
    data: {
      roomId: room.id,
      totalQuestions,
      results: {
        create: results.map(({ companyId, acertos }) => ({ companyId, acertos }))
      }
    },
    include: { results: { include: { company: { select: { name: true, managerName: true } } } } }
  })
   console.log('[Quiz] emitindo quiz_finish para sala:', roomCode)
  io.to(roomCode).emit('quiz_finish')

  return quiz
}

async function getQuizRanking(roomCode) {
  const quiz = await prisma.quiz.findFirst({
    where: { room: { code: roomCode } },
    include: {
      results: {
        orderBy: { acertos: 'desc' },
        include: { company: { select: { name: true, managerName: true } } }
      }
    }
  })

  if (!quiz) throw new Error('QUIZ_NOT_FOUND')

  return {
    totalQuestions: quiz.totalQuestions,
    ranking: quiz.results.map((r, i) => ({
      posicao: i + 1,
      companyId: r.companyId,
      empresaNome: r.company.name,
      gerenteNome: r.company.managerName,
      acertos: r.acertos,
      aproveitamento: ((r.acertos / quiz.totalQuestions) * 100).toFixed(1)
    }))
  }
}

module.exports = { saveQuiz, getQuizRanking }
