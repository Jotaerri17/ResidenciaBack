const { 
  saveQuiz, 
  getQuizRanking, 
  createQuizSession, 
  getQuizQuestions, 
  submitAnswer, 
  finishQuizForCompany 
} = require('../service/QuizService')

async function handleSaveQuiz(req, res) {
  try {
    const { roomCode } = req.params
    const facilitatorToken = req.headers['x-facilitator-token']
    const { totalQuestions, results } = req.body

    if (!facilitatorToken) {
      return res.status(401).json({ message: 'Token do facilitador obrigatório.' })
    }
    if (!totalQuestions || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ message: 'totalQuestions e results são obrigatórios.' })
    }

    const itemInvalido = results.find(
      (r) => typeof r.companyId !== 'string' || !Number.isInteger(r.acertos) || r.acertos < 0
    )
    if (itemInvalido) {
      return res.status(400).json({ message: 'Cada item de results deve ter companyId (string) e acertos (inteiro >= 0).' })
    }

    const acertosExcedido = results.find((r) => r.acertos > totalQuestions)
    if (acertosExcedido) {
      return res.status(400).json({ message: 'acertos não pode ser maior que totalQuestions.' })
    }

    const io = req.app.get('io')
    const quiz = await saveQuiz({ roomCode, facilitatorToken, totalQuestions, results }, io)

    return res.status(201).json({ message: 'Quiz salvo com sucesso!', quiz })
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND')
      return res.status(404).json({ message: 'Sala não encontrada.' })
    if (error.message === 'UNAUTHORIZED')
      return res.status(403).json({ message: 'Acesso negado.' })
    if (error.message === 'QUIZ_ALREADY_EXISTS')
      return res.status(409).json({ message: 'Quiz já registrado para esta sala.' })
    if (error.message === 'COMPANY_NOT_IN_ROOM')
      return res.status(400).json({ message: 'Um ou mais companyId não pertencem a esta sala.' })
    console.error(error)
    return res.status(500).json({ message: 'Erro ao salvar quiz.' })
  }
}

async function handleGetQuizRanking(req, res) {
  try {
    const { roomCode } = req.params
    const ranking = await getQuizRanking(roomCode)
    return res.status(200).json(ranking)
  } catch (error) {
    if (error.message === 'QUIZ_NOT_FOUND')
      return res.status(404).json({ message: 'Quiz não encontrado.' })
    console.error(error)
    return res.status(500).json({ message: 'Erro ao buscar ranking do quiz.' })
  }
}

async function handleGenerateQuestions(req, res) {
  try {
    const { roomCode } = req.params
    const facilitatorToken = req.headers['x-facilitator-token']
    const { totalQuestions, categoryIds } = req.body

    if (!facilitatorToken) return res.status(401).json({ message: 'Token do facilitador obrigatório.' })
    if (!totalQuestions || totalQuestions < 1) return res.status(400).json({ message: 'totalQuestions é obrigatório e deve ser >= 1.' })

    let categoryNames = []
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const prisma = require('../lib/prisma')
      const dbCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { name: true }
      })
      categoryNames = dbCategories.map(c => c.name)
    }

    const { generateQuestionsWithAI } = require('../service/QuizAIService')
    const questions = await generateQuestionsWithAI(totalQuestions, categoryNames)
    const quiz = await createQuizSession({ roomCode, facilitatorToken, totalQuestions, questions })

    return res.status(201).json({ message: 'Quiz gerado com sucesso!', quiz, questions })
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') return res.status(404).json({ message: 'Sala não encontrada.' })
    if (error.message === 'UNAUTHORIZED') return res.status(403).json({ message: 'Acesso negado.' })
    if (error.message === 'QUIZ_ALREADY_EXISTS') return res.status(409).json({ message: 'Quiz já registrado para esta sala.' })
    console.error(error)
    return res.status(500).json({ message: 'Erro ao gerar quiz.' })
  }
}

async function handleGetQuestions(req, res) {
  try {
    const { roomCode } = req.params
    const { companyId } = req.body || req.query || {}

    if (!companyId) return res.status(400).json({ message: 'companyId é obrigatório.' })

    const questions = await getQuizQuestions({ roomCode, companyId })
    return res.status(200).json({ questions })
  } catch (error) {
    if (error.message === 'QUIZ_NOT_FOUND') return res.status(404).json({ message: 'Quiz não encontrado.' })
    if (error.message === 'COMPANY_NOT_IN_ROOM') return res.status(400).json({ message: 'Empresa não pertence a esta sala.' })
    console.error(error)
    return res.status(500).json({ message: 'Erro ao buscar perguntas.' })
  }
}

async function handleSubmitAnswer(req, res) {
  try {
    const { roomCode } = req.params
    const { companyId, questionId, selectedOption, timeExpired } = req.body

    if (!companyId || !questionId) return res.status(400).json({ message: 'companyId e questionId são obrigatórios.' })

    const result = await submitAnswer({ roomCode, companyId, questionId, selectedOption, timeExpired })
    return res.status(200).json(result)
  } catch (error) {
    if (error.message === 'QUIZ_NOT_FOUND') return res.status(404).json({ message: 'Quiz não encontrado.' })
    if (error.message === 'COMPANY_NOT_IN_ROOM') return res.status(400).json({ message: 'Empresa não pertence a esta sala.' })
    if (error.message === 'QUIZ_NOT_ACTIVE') return res.status(400).json({ message: 'Quiz não está ativo.' })
    if (error.message === 'QUESTION_NOT_IN_QUIZ') return res.status(400).json({ message: 'Pergunta não pertence a este quiz.' })
    if (error.message === 'ANSWER_ALREADY_EXISTS') return res.status(409).json({ message: 'Resposta já enviada para esta pergunta.' })
    console.error(error)
    return res.status(500).json({ message: 'Erro ao salvar resposta.' })
  }
}

async function handleFinishQuiz(req, res) {
  try {
    const { roomCode } = req.params
    const { companyId } = req.body

    if (!companyId) return res.status(400).json({ message: 'companyId é obrigatório.' })

    const io = req.app.get('io')
    const result = await finishQuizForCompany({ roomCode, companyId }, io)
    return res.status(200).json({ message: 'Quiz finalizado!', ...result })
  } catch (error) {
    if (error.message === 'QUIZ_NOT_FOUND') return res.status(404).json({ message: 'Quiz não encontrado.' })
    if (error.message === 'COMPANY_NOT_IN_ROOM') return res.status(400).json({ message: 'Empresa não pertence a esta sala.' })
    console.error(error)
    return res.status(500).json({ message: 'Erro ao finalizar quiz.' })
  }
}

module.exports = { 
  handleSaveQuiz, 
  handleGetQuizRanking, 
  handleGenerateQuestions, 
  handleGetQuestions, 
  handleSubmitAnswer, 
  handleFinishQuiz 
}
