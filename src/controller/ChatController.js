const { chat } = require('../service/ChatService')

async function handleChat(req, res) {
  try {
    const { roomConfig, messages, message } = req.body

    if (!roomConfig || typeof roomConfig !== 'object') {
      return res.status(400).json({ message: 'roomConfig é obrigatório.' })
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ message: 'message é obrigatório.' })
    }

    const requiredFields = ['custoUntPereciveis', 'custoUntMercearia', 'custoUntEletro', 'custoUntHipel']
    const missing = requiredFields.filter(f => roomConfig[f] === undefined || roomConfig[f] === null)
    if (missing.length > 0) {
      return res.status(400).json({ message: `Campos obrigatórios em roomConfig faltando: ${missing.join(', ')}` })
    }

    const reply = await chat({ roomConfig, messages, message: message.trim() })

    return res.status(200).json({ reply })
  } catch (error) {
    console.error('Erro no chat:', error)
    return res.status(500).json({ message: 'Erro ao processar mensagem do chat.' })
  }
}

module.exports = { handleChat }
