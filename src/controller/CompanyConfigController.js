const { saveConfig } = require('../service/CompanyConfigService')

async function handleSaveConfig(req, res) {
  try {
    const companyId = req.params.id || req.body.companyId
    const { companyId: _, ...configData } = req.body
    const io = req.app.get('io')

    if (!companyId) {
      return res.status(400).json({ message: 'companyId e obrigatorio.' })
    }

    const result = await saveConfig({ companyId, ...configData }, io)

    return res.status(201).json({
      message: 'Configuracao enviada com sucesso!',
      ...result,
    })

  } catch (error) {
    if (error.message === 'COMPANY_NOT_FOUND')
      return res.status(404).json({ message: 'Empresa nao encontrada.' })

    if (error.message === 'GAME_NOT_STARTED')
      return res.status(400).json({ message: 'O jogo ainda nao foi iniciado.' })

    if (error.message === 'ALREADY_CONFIGURED')
      return res.status(400).json({
        message: 'Configuracao ja enviada para este round.'
      })

    if (error.message === 'INVALID_STOCK_VALUE')
      return res.status(400).json({ message: 'Valores de estoque não podem ser negativos.' })

    if (error.message === 'INVALID_MARGEM_VALUE')
      return res.status(400).json({ message: 'Valores de margem não podem ser negativos.' })

    if (error.message === 'INVALID_OPERADORES_VALUE')
      return res.status(400).json({ message: 'Quantidade de operadores não pode ser negativa.' })

    return res.status(500).json({ message: 'Erro ao salvar configuracao.' })
  }
}

module.exports = { handleSaveConfig }
