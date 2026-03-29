const { Router } = require  ('express')
const roomController = require ('../controller/RoomsController.js')

const router = Router()

router.post('/', roomController.handleCreateRoom)       // criar sala
router.get('/:code', roomController.handleGetRoom)  // buscar sala pelo código
router.patch('/:code/cancel', roomController.handleCancelRoom) // cancela a sala
router.patch('/:code/start', roomController.handleStartRoom)

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Cria uma nova sala
 *     tags:
 *       - Rooms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - custoUntPereciveis
 *               - custoUntMercearia
 *               - custoUntEletro
 *               - custoUntHipel
 *             properties:
 *               caixa:
 *                 type: number
 *                 default: 700000
 *                 description: Saldo inicial de cada empresa
 *               juros:
 *                 type: number
 *                 default: 12
 *                 description: Taxa de juros (%) cobrada quando a empresa ultrapassa o caixa
 *               totalRounds:
 *                 type: integer
 *                 default: 4
 *                 description: Número de rodadas do jogo
 *               quebrasPereciveis:
 *                 type: number
 *                 default: 2
 *               quebrasMercearia:
 *                 type: number
 *                 default: 1.5
 *               quebrasEletro:
 *                 type: number
 *                 default: 0
 *               quebrasHipel:
 *                 type: number
 *                 default: 1
 *               agingPereciveis:
 *                 type: number
 *                 default: 5.8
 *               agingMercearia:
 *                 type: number
 *                 default: 0.8
 *               agingEletro:
 *                 type: number
 *                 default: 1.3
 *               agingHipel:
 *                 type: number
 *                 default: 1.1
 *               impostoPereciveis:
 *                 type: number
 *                 default: 12
 *               impostoMercearia:
 *                 type: number
 *                 default: 7
 *               impostoEletro:
 *                 type: number
 *                 default: 25
 *               impostoHipel:
 *                 type: number
 *                 default: 17
 *               custoUntPereciveis:
 *                 type: number
 *                 description: Custo unitário de perecíveis (obrigatório)
 *                 example: 5.50
 *               custoUntMercearia:
 *                 type: number
 *                 description: Custo unitário de mercearia (obrigatório)
 *                 example: 3.20
 *               custoUntEletro:
 *                 type: number
 *                 description: Custo unitário de eletro (obrigatório)
 *                 example: 150.00
 *               custoUntHipel:
 *                 type: number
 *                 description: Custo unitário de higiene/limpeza (obrigatório)
 *                 example: 8.90
 *               capexSegurancaValor:
 *                 type: number
 *                 default: 15000
 *               capexBalancaValor:
 *                 type: number
 *                 default: 20000
 *               capexFreezerValor:
 *                 type: number
 *                 default: 20000
 *               capexRedesValor:
 *                 type: number
 *                 default: 18000
 *               capexSiteValor:
 *                 type: number
 *                 default: 25000
 *               capexSelfCheckoutValor:
 *                 type: number
 *                 default: 40000
 *               capexMelhoriaContinuaValor:
 *                 type: number
 *                 default: 12000
 *               events:
 *                 type: array
 *                 description: Eventos agendados para rodadas específicas
 *                 items:
 *                   type: object
 *                   required:
 *                     - round
 *                     - type
 *                     - description
 *                   properties:
 *                     round:
 *                       type: integer
 *                       example: 2
 *                     type:
 *                       type: string
 *                       enum: [EQUIPMENT_FAILURE, SYSTEM_FAILURE, OTHER]
 *                     description:
 *                       type: string
 *                       example: "Falha no sistema de refrigeração"
 *     responses:
 *       201:
 *         description: Sala criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sala criada com sucesso!
 *                 room:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     code:
 *                       type: string
 *                       example: "A3KZ91"
 *                     facilitatorToken:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: WAITING
 *       500:
 *         description: Erro ao criar sala
 *
 * /rooms/{code}:
 *   get:
 *     summary: Busca sala pelo código
 *     tags:
 *       - Rooms
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código único da sala
 *         example: "A3KZ91"
 *     responses:
 *       200:
 *         description: Sala encontrada
 *       404:
 *         description: Sala não encontrada
 *       500:
 *         description: Erro ao buscar sala
 *
 * /rooms/{code}/cancel:
 *   patch:
 *     summary: Cancela uma sala
 *     tags:
 *       - Rooms
 *     security:
 *       - facilitatorToken: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código único da sala
 *         example: "A3KZ91"
 *       - in: header
 *         name: x-facilitator-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token do facilitador gerado ao criar a sala
 *     responses:
 *       200:
 *         description: Sala cancelada com sucesso
 *       401:
 *         description: Token do facilitador obrigatório
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Sala não encontrada
 *       400:
 *         description: Sala já foi cancelada
 *       500:
 *         description: Erro ao cancelar sala
 *
 * /rooms/{code}/start:
 *   patch:
 *     summary: Inicia o jogo da sala
 *     tags:
 *       - Rooms
 *     security:
 *       - facilitatorToken: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código único da sala
 *         example: "A3KZ91"
 *       - in: header
 *         name: x-facilitator-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token do facilitador gerado ao criar a sala
 *     responses:
 *       200:
 *         description: Jogo iniciado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Jogo iniciado com sucesso!
 *                 room:
 *                   type: object
 *       401:
 *         description: Token do facilitador obrigatório
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Sala não encontrada
 *       400:
 *         description: Sala não está aguardando ou não há empresas cadastradas
 *       500:
 *         description: Erro ao iniciar jogo
 */
 
module.exports = router