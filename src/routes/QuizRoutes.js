const { Router } = require('express')
const { 
  handleSaveQuiz, 
  handleGetQuizRanking, 
  handleGenerateQuestions, 
  handleGetQuestions, 
  handleSubmitAnswer, 
  handleFinishQuiz 
} = require('../controller/QuizController')

const router = Router()

// NOVAS ROTAS — adicionar antes das rotas legadas
router.post('/:roomCode/generate', handleGenerateQuestions)
router.post('/:roomCode/questions', handleGetQuestions)
router.post('/:roomCode/answer', handleSubmitAnswer)
router.post('/:roomCode/finish', handleFinishQuiz)

// ROTAS LEGADAS — manter intactas
router.post('/:roomCode', handleSaveQuiz)
router.get('/:roomCode/ranking', handleGetQuizRanking)

/**
 * @swagger
 * /quiz/{roomCode}:
 *   post:
 *     summary: Salva o resultado do quiz de uma sala
 *     description: Registra as respostas de cada empresa no quiz final. Requer autenticação via token do facilitador.
 *     tags:
 *       - Quiz
 *     security:
 *       - facilitatorToken: []
 *     parameters:
 *       - in: path
 *         name: roomCode
 *         required: true
 *         schema:
 *           type: string
 *         example: "A3KZ91"
 *         description: Código único da sala
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totalQuestions
 *               - results
 *             properties:
 *               totalQuestions:
 *                 type: integer
 *                 description: Total de perguntas do quiz
 *                 example: 10
 *               results:
 *                 type: array
 *                 description: Lista com o resultado de cada empresa
 *                 items:
 *                   type: object
 *                   required:
 *                     - companyId
 *                     - acertos
 *                   properties:
 *                     companyId:
 *                       type: string
 *                       description: ID da empresa
 *                       example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                     acertos:
 *                       type: integer
 *                       description: Número de respostas corretas
 *                       example: 7
 *     responses:
 *       201:
 *         description: Quiz salvo com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Quiz salvo com sucesso!
 *                 quiz:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     roomId:
 *                       type: string
 *                     totalQuestions:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           companyId:
 *                             type: string
 *                           acertos:
 *                             type: integer
 *                           company:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               managerName:
 *                                 type: string
 *       400:
 *         description: Campos obrigatórios ausentes ou results inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: totalQuestions e results são obrigatórios.
 *       401:
 *         description: Token do facilitador não informado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token do facilitador obrigatório.
 *       403:
 *         description: Token inválido — acesso negado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Acesso negado.
 *       404:
 *         description: Sala não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sala não encontrada.
 *       500:
 *         description: Erro interno ao salvar quiz
 *
 * /quiz/{roomCode}/ranking:
 *   get:
 *     summary: Retorna o ranking do quiz de uma sala
 *     description: Busca os resultados do quiz ordenados por número de acertos (decrescente) e calcula o aproveitamento percentual de cada empresa.
 *     tags:
 *       - Quiz
 *     parameters:
 *       - in: path
 *         name: roomCode
 *         required: true
 *         schema:
 *           type: string
 *         example: "A3KZ91"
 *         description: Código único da sala
 *     responses:
 *       200:
 *         description: Ranking do quiz retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalQuestions:
 *                   type: integer
 *                   example: 10
 *                 ranking:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       posicao:
 *                         type: integer
 *                         description: Posição no ranking (1 = primeiro lugar)
 *                         example: 1
 *                       companyId:
 *                         type: string
 *                         example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                       empresaNome:
 *                         type: string
 *                         example: "Loja Alpha"
 *                       gerenteNome:
 *                         type: string
 *                         example: "João Silva"
 *                       acertos:
 *                         type: integer
 *                         example: 7
 *                       aproveitamento:
 *                         type: string
 *                         description: Percentual de acertos com uma casa decimal
 *                         example: "70.0"
 *       404:
 *         description: Quiz não encontrado para a sala informada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Quiz não encontrado.
 *       500:
 *         description: Erro interno ao buscar ranking
 */
module.exports = router
