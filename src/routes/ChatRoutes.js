const { Router } = require('express')
const { handleChat } = require('../controller/ChatController')

const router = Router()

router.post('/', handleChat)

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Chatbot de planejamento para o jogador
 *     description: >
 *       Recebe as configurações da sala e o histórico de conversa, e retorna uma
 *       resposta do assistente orientando o jogador no planejamento de suas decisões.
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomConfig
 *               - message
 *             properties:
 *               roomConfig:
 *                 type: object
 *                 description: Configurações da sala (mesmo formato retornado por GET /rooms/:code)
 *                 required:
 *                   - custoUntPereciveis
 *                   - custoUntMercearia
 *                   - custoUntEletro
 *                   - custoUntHipel
 *                 properties:
 *                   caixa:
 *                     type: number
 *                     example: 700000
 *                   juros:
 *                     type: number
 *                     example: 12
 *                   totalRounds:
 *                     type: integer
 *                     example: 4
 *                   custoUntPereciveis:
 *                     type: number
 *                     example: 5.5
 *                   custoUntMercearia:
 *                     type: number
 *                     example: 3.2
 *                   custoUntEletro:
 *                     type: number
 *                     example: 150
 *                   custoUntHipel:
 *                     type: number
 *                     example: 8.9
 *               messages:
 *                 type: array
 *                 description: Histórico da conversa (omitir na primeira mensagem)
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               message:
 *                 type: string
 *                 description: Mensagem atual do jogador
 *                 example: "Quanto estoque de perecíveis devo comprar na primeira rodada?"
 *     responses:
 *       200:
 *         description: Resposta do assistente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *                   example: "Com base nas configurações da sala, recomendo comprar..."
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao processar mensagem
 */

module.exports = router
