const { saveQuiz, getQuizRanking } = require('../service/QuizService')

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

module.exports = { handleSaveQuiz, handleGetQuizRanking }
