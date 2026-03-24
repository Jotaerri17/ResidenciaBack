const {Router} = require ('express')
const {handleJoinRoom, handleGetCompanies} = require ('../controller/CompaniesController.js')

const router = Router()

router.post('/join', handleJoinRoom) // coloca os dados da empresa e entra na sala
router.get('/:code', handleGetCompanies) // pega as empresas que estão na sala

/**
 * @swagger
 * /companies/join:
 *   post:
 *     summary: Entra em uma sala e cadastra a empresa
 *     tags:
 *       - Companies
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - managerName
 *             properties:
 *               code:
 *                 type: string
 *                 example: "A3KZ91"
 *               name:
 *                 type: string
 *                 example: "Loja Alpha"
 *               managerName:
 *                 type: string
 *                 example: "João Silva"
 *     responses:
 *       201:
 *         description: Empresa cadastrada com sucesso
 *       400:
 *         description: Falta um campo obrigatório ou sala não disponível
 *       404:
 *         description: Sala não encontrada
 *       500:
 *         description: Erro ao entrar na sala
 *
 * /companies/{code}:
 *   get:
 *     summary: Lista todas as empresas de uma sala
 *     tags:
 *       - Companies
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         example: "A3KZ91"
 *         description: Código único da sala
 *     responses:
 *       200:
 *         description: Lista de empresas da sala
 *       404:
 *         description: Sala não encontrada
 *       500:
 *         description: Erro ao buscar empresas
 */
module.exports = router