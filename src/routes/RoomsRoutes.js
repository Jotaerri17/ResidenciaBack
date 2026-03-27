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
 *               juros:
 *                 type: number
 *                 default: 12
 *               totalRounds:
 *                 type: integer
 *                 default: 4
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
 *               custoUntMercearia:
 *                 type: number
 *               custoUntEletro:
 *                 type: number
 *               custoUntHipel:
 *                 type: number
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     round:
 *                       type: integer
 *                     type:
 *                       type: string
 *                       enum: [EQUIPMENT_FAILURE, SYSTEM_FAILURE, OTHER]
 *                     description:
 *                       type: string
 *     responses:
 *       201:
 *         description: Sala criada com sucesso
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
 *     responses:
 *       200:
 *         description: Sala encontrada
 *       404:
 *         description: Sala não encontrada
 *       500:
 *         description: Erro ao buscar sala
 * /rooms/{code}/cancel:
 *   patch:
 *     summary: Cancela uma sala
 *     tags:
 *       - Rooms
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código único da sala
 *       - in: header
 *         name: x-facilitator-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token do facilitador
 *     responses:
 *       200:
 *         description: Sala cancelada com sucesso
 *       401:
 *         description: Token do facilitador obrigatório
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Sala não encontrada
 *       500:
 *         description: Erro ao cancelar sala
 */
 
module.exports = router