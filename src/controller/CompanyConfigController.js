const { saveConfig } = require('../service/CompanyConfigService')

async function handleSaveConfig(req, res) {
  try {
    const companyId = req.params.id || req.body.companyId
    const { companyId: _, ...configData } = req.body
    const io = req.app.get('io')

    if (!companyId) {
      return res.status(400).json({ message: 'companyId é obrigatório.' })
    }

    const result = await saveConfig({ companyId, ...configData }, io)

    return res.status(201).json({
      message: 'Configuração enviada com sucesso!',
      ...result,
    })

  } catch (error) {
    if (error.message === 'COMPANY_NOT_FOUND')
      return res.status(404).json({ message: 'Empresa não encontrada.' })

    if (error.message === 'GAME_NOT_STARTED')
      return res.status(400).json({ message: 'O jogo ainda não foi iniciado.' })

    if (error.message === 'ALREADY_CONFIGURED')
      return res.status(400).json({ message: 'Configuração já enviada para este round.' })

    if (error.message === 'INVALID_STOCK')
      return res.status(400).json({ message: 'Valores de estoque devem ser números não-negativos.' })

    if (error.message === 'INVALID_MARGIN')
      return res.status(400).json({ message: 'Valores de margem devem ser números válidos.' })

    if (error.message === 'STOCK_LIMIT_EXCEEDED')
      return res.status(400).json({ message: 'Estoque solicitado ultrapassa o limite disponível para esta empresa.' })

    // Race condition: unique constraint disparado concorrentemente
    if (error.code === 'P2002')
      return res.status(400).json({ message: 'Configuração já enviada para este round.' })

    console.error(error)
    return res.status(500).json({ message: 'Erro ao salvar configuração.' })
  }
}

module.exports = { handleSaveConfig }
