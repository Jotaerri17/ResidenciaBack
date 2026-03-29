const {Router} = require ('express')
const {handleJoinRoom, handleGetCompanies, handleLeaveRoom, handleGetCompanySettings, handleUpdateRoundSettings} = require ('../controller/CompaniesController.js')
const { handleSaveConfig } = require('../controller/CompanyConfigController')

const router = Router()

router.post('/join', handleJoinRoom) // coloca os dados da empresa e entra na sala
router.post('/:id/configs', handleSaveConfig) // envia config da rodada
router.get('/:id/settings', handleGetCompanySettings) // pega settings da empresa por ID
router.get('/:code', handleGetCompanies) // pega as empresas que estão na sala
router.delete('/:id/leave', handleLeaveRoom)
router.patch('/:id/settings', handleUpdateRoundSettings);

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
 *                 description: Código da sala
 *               name:
 *                 type: string
 *                 example: "Loja Alpha"
 *                 description: Nome da empresa
 *               managerName:
 *                 type: string
 *                 example: "João Silva"
 *                 description: Nome do gerente responsável
 *     responses:
 *       201:
 *         description: Empresa cadastrada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Empresa cadastrada com sucesso!
 *                 company:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     managerName:
 *                       type: string
 *                     caixa:
 *                       type: number
 *       400:
 *         description: Falta campo obrigatório ou sala não está disponível
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
 *
 * /companies/{id}/leave:
 *   delete:
 *     summary: Empresa sai da sala
 *     tags:
 *       - Companies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: Empresa removida da sala com sucesso
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro ao sair da sala
 *
 * /companies/{id}/settings:
 *   get:
 *     summary: Busca as configurações/parâmetros da empresa para a rodada
 *     tags:
 *       - Companies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     responses:
 *       200:
 *         description: Configurações da empresa retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 saldoInicial:
 *                   type: number
 *                 juros:
 *                   type: number
 *                 custoUntPereciveis:
 *                   type: number
 *                 custoUntMercearia:
 *                   type: number
 *                 custoUntEletro:
 *                   type: number
 *                 custoUntHipel:
 *                   type: number
 *                 custoPorOperador:
 *                   type: number
 *                   example: 3000
 *                 capexItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       label:
 *                         type: string
 *                       cost:
 *                         type: number
 *                       risk:
 *                         type: string
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro ao buscar configurações da empresa
 *   patch:
 *     summary: Salva as decisões da empresa para a rodada atual
 *     description: Debita do caixa da empresa os custos de estoque, pessoal e CAPEX selecionados. Aplica juros se o gasto ultrapassar o saldo disponível.
 *     tags:
 *       - Companies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estoquePereciveis:
 *                 type: integer
 *                 example: 100
 *               estoqueMercearia:
 *                 type: integer
 *                 example: 200
 *               estoqueEletro:
 *                 type: integer
 *                 example: 10
 *               estoqueHipel:
 *                 type: integer
 *                 example: 50
 *               marginPereciveis:
 *                 type: number
 *                 description: Margem de lucro em % para perecíveis
 *                 example: 20
 *               marginMercearia:
 *                 type: number
 *                 example: 15
 *               marginEletro:
 *                 type: number
 *                 example: 30
 *               marginHipel:
 *                 type: number
 *                 example: 25
 *               operadoresCaixa:
 *                 type: integer
 *                 example: 3
 *               operadoresServico:
 *                 type: integer
 *                 example: 2
 *               capexItems:
 *                 type: array
 *                 description: Lista de investimentos CAPEX selecionados
 *                 items:
 *                   type: string
 *                   enum: [seguranca, balanca, redes, site, selfCheckout, melhoriaContinua]
 *                 example: ["seguranca", "redes"]
 *     responses:
 *       200:
 *         description: Configurações da rodada salvas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Configurações da rodada salvas com sucesso!
 *                 updatedCompany:
 *                   type: object
 *                   properties:
 *                     caixa:
 *                       type: number
 *                 totalGastos:
 *                   type: number
 *                 excedente:
 *                   type: number
 *                 jurosAplicado:
 *                   type: number
 *                 capexSelecionados:
 *                   type: array
 *                   items:
 *                     type: string
 *                 prices:
 *                   type: object
 *                   properties:
 *                     pereciveis:
 *                       type: number
 *                     mercearia:
 *                       type: number
 *                     eletro:
 *                       type: number
 *                     hipel:
 *                       type: number
 *       400:
 *         description: Saldo insuficiente
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro ao salvar configurações da rodada
 *
 * /companies/{id}/configs:
 *   post:
 *     summary: Envia a configuração da empresa para a rodada atual
 *     description: Salva as decisões de estoque, margem e CAPEX da empresa. Só pode ser enviado uma vez por rodada e apenas quando o jogo estiver em andamento.
 *     tags:
 *       - Companies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da empresa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estoquePereciveis:
 *                 type: number
 *                 default: 0
 *               estoqueMercearia:
 *                 type: number
 *                 default: 0
 *               estoqueEletro:
 *                 type: number
 *                 default: 0
 *               estoqueHipel:
 *                 type: number
 *                 default: 0
 *               margemPereciveis:
 *                 type: number
 *                 default: 0
 *                 description: Margem de lucro em %
 *               margemMercearia:
 *                 type: number
 *                 default: 0
 *               margemEletro:
 *                 type: number
 *                 default: 0
 *               margemHipel:
 *                 type: number
 *                 default: 0
 *               operadoresVenda:
 *                 type: integer
 *                 default: 0
 *               operadoresServico:
 *                 type: integer
 *                 default: 0
 *               capexSeguranca:
 *                 type: boolean
 *                 default: false
 *               capexBalanca:
 *                 type: boolean
 *                 default: false
 *               capexRedes:
 *                 type: boolean
 *                 default: false
 *               capexSite:
 *                 type: boolean
 *                 default: false
 *               capexSelfCheckout:
 *                 type: boolean
 *                 default: false
 *               capexMelhoriaContinua:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Configuração enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Configuracao enviada com sucesso!
 *                 round:
 *                   type: integer
 *                   example: 1
 *                 config:
 *                   type: object
 *       400:
 *         description: Jogo não iniciado ou configuração já enviada para esta rodada
 *       404:
 *         description: Empresa não encontrada
 *       500:
 *         description: Erro ao salvar configuração
 */
module.exports = router