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

async function createQuizSession({ roomCode, facilitatorToken, totalQuestions, questions }) {
  const prisma = require('../lib/prisma')
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: { quiz: true, companies: { select: { id: true } } }
  })

  if (!room) throw new Error('ROOM_NOT_FOUND')
  if (room.facilitatorToken !== facilitatorToken) throw new Error('UNAUTHORIZED')
  if (room.quiz) throw new Error('QUIZ_ALREADY_EXISTS')

  // Criar perguntas no banco (evita duplicar por texto)
  const createdQuestions = []
  for (const q of questions) {
    const existing = await prisma.question.findFirst({ where: { text: q.text } })
    if (existing) {
      createdQuestions.push(existing)
    } else {
      const created = await prisma.question.create({
        data: {
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: { connectOrCreate: { where: { name: q.category }, create: { name: q.category } } }
        }
      })
      createdQuestions.push(created)
    }
  }

  // Criar Quiz + QuizSession
  const quiz = await prisma.quiz.create({
    data: {
      roomId: room.id,
      totalQuestions,
      session: {
        create: {
          questions: createdQuestions.map(q => q.id),
          status: 'PENDING'
        }
      }
    },
    include: { session: true }
  })

  return quiz
}

async function getQuizQuestions({ roomCode, companyId }) {
  const prisma = require('../lib/prisma')
  const quiz = await prisma.quiz.findFirst({
    where: { room: { code: roomCode } },
    include: { session: true, room: { include: { companies: { select: { id: true } } } } }
  })

  if (!quiz || !quiz.session) throw new Error('QUIZ_NOT_FOUND')
  if (!quiz.room.companies.some(c => c.id === companyId)) throw new Error('COMPANY_NOT_IN_ROOM')

  if (quiz.session.status === 'PENDING') {
    await prisma.quizSession.update({
      where: { id: quiz.session.id },
      data: { startedAt: new Date(), status: 'ACTIVE' }
    })
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: quiz.session.questions } },
    select: { id: true, text: true, options: true, category: { select: { name: true } } }
  })

  return questions.map(q => ({
    id: q.id,
    text: q.text,
    options: q.options,
    category: q.category?.name || null
  }))
}

async function submitAnswer({ roomCode, companyId, questionId, selectedOption, timeExpired }) {
  const prisma = require('../lib/prisma')
  const quiz = await prisma.quiz.findFirst({
    where: { room: { code: roomCode } },
    include: { session: true, room: { include: { companies: { select: { id: true } } } } }
  })

  if (!quiz || !quiz.session) throw new Error('QUIZ_NOT_FOUND')
  if (!quiz.room.companies.some(c => c.id === companyId)) throw new Error('COMPANY_NOT_IN_ROOM')
  if (quiz.session.status !== 'ACTIVE') throw new Error('QUIZ_NOT_ACTIVE')
  if (!quiz.session.questions.includes(questionId)) throw new Error('QUESTION_NOT_IN_QUIZ')

  // Verificar se já respondeu essa pergunta
  const existingAnswer = await prisma.answer.findFirst({
    where: { quizSessionId: quiz.session.id, companyId, questionId }
  })
  if (existingAnswer) throw new Error('ANSWER_ALREADY_EXISTS')

  let isCorrect = false
  if (!timeExpired) {
    const question = await prisma.question.findUnique({ where: { id: questionId } })
    isCorrect = question.correctAnswer === selectedOption
  }

  const answer = await prisma.answer.create({
    data: {
      quizSessionId: quiz.session.id,
      companyId,
      questionId,
      selectedOption: timeExpired ? null : selectedOption,
      isCorrect: timeExpired ? false : isCorrect,
      timeExpired: !!timeExpired
    }
  })

  return { isCorrect, timeExpired: answer.timeExpired }
}

async function finishQuizForCompany({ roomCode, companyId }, io) {
  const prisma = require('../lib/prisma')
  const quiz = await prisma.quiz.findFirst({
    where: { room: { code: roomCode } },
    include: { session: true, room: { include: { companies: { select: { id: true } } } }, results: true }
  })

  if (!quiz || !quiz.session) throw new Error('QUIZ_NOT_FOUND')
  if (!quiz.room.companies.some(c => c.id === companyId)) throw new Error('COMPANY_NOT_IN_ROOM')

  const answers = await prisma.answer.findMany({
    where: { quizSessionId: quiz.session.id, companyId }
  })

  const acertos = answers.filter(a => a.isCorrect).length
  const timeExpiredCount = answers.filter(a => a.timeExpired).length

  await prisma.quizResult.upsert({
    where: { quizId_companyId: { quizId: quiz.id, companyId } },
    create: { quizId: quiz.id, companyId, acertos, timeExpiredCount },
    update: { acertos, timeExpiredCount }
  })

  // Re-lê o count do banco APÓS o upsert para evitar race condition:
  // se 2 empresas chamam finishQuizForCompany ao mesmo tempo, ambas podem ver
  // quiz.results vazio antes de qualquer commit, e nenhuma emitiria quiz_finish.
  const allCompanyIds = quiz.room.companies.map(c => c.id)
  const resultsAtuais = await prisma.quizResult.count({ where: { quizId: quiz.id } })

  if (resultsAtuais >= allCompanyIds.length) {
    await prisma.quizSession.update({
      where: { id: quiz.session.id },
      data: { status: 'FINISHED', finishedAt: new Date() }
    })
    io.to(roomCode).emit('quiz_finish')
  }

  return { acertos, totalQuestions: quiz.totalQuestions, timeExpiredCount }
}

module.exports = { saveQuiz, getQuizRanking, createQuizSession, getQuizQuestions, submitAnswer, finishQuizForCompany }
