const { createRoom, getRoomByCode, cancelRoom, startRoom }= require ('../service/RoomsService.js')


async function handleCreateRoom(req, res) {
  try {
    const { caixa, juros, totalRounds, quebrasPereciveis,
    quebrasMercearia, quebrasEletro,quebrasHipel,agingEletro,agingHipel,agingMercearia,agingPereciveis, 
    impostoPereciveis, impostoMercearia, impostoEletro, impostoHipel, events} = req.body

    const room = await createRoom({ caixa, juros, totalRounds, quebrasPereciveis,
    quebrasMercearia, quebrasEletro,quebrasHipel,agingEletro,agingHipel,agingMercearia,agingPereciveis, 
    impostoPereciveis, impostoMercearia, impostoEletro, impostoHipel, events})

    return res.status(201).json({
      message: 'Sala criada com sucesso!',
      room,
      facilitadorToken: room.facilitadorToken
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Erro ao criar sala.' })
  }
}

async function handleGetRoom(req, res) {
  try {
    const { code } = req.params

    const room = await getRoomByCode(code)

    if (!room) {
      return res.status(404).json({ message: 'Sala não encontrada.' })
    }

    return res.status(200).json(room)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Erro ao buscar sala.' })
  }
}
async function handleCancelRoom(req, res) {
  try {
    const io = req.app.get('io')
    const { code } = req.params
    const facilitatorToken = req.headers['x-facilitador-token']

    if (!facilitatorToken) {
      return res.status(401).json({ message: 'Token do facilitador obrigatório.' })
    }

    const room = await cancelRoom({ code, facilitatorToken }, io)

    return res.status(200).json({
      message: 'Sala cancelada com sucesso!',
      room,
    })
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ message: 'Sala não encontrada.' })
    }
    if (error.message === 'UNAUTHORIZED') {
      return res.status(403).json({ message: 'Acesso negado.' })
    }
    if (error.message === 'ROOM_ALREADY_CANCELLED') {
      return res.status(400).json({ message: 'Sala já foi cancelada.' })
    }
    console.error(error)
    return res.status(500).json({ message: 'Erro ao cancelar sala.' })
  }
}

async function handleStartRoom(req, res) {
  try {
    const { code } = req.params
    const facilitatorToken = req.headers['x-facilitator-token']
    const io = req.app.get('io')

    if (!facilitatorToken) {
      return res.status(401).json({
        message: 'Token do facilitador obrigatório.'
      })
    }

    const room = await startRoom({ code, facilitatorToken }, io)

    return res.status(200).json({
      message: 'Jogo iniciado com sucesso!',
      room,
    })

  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND')
      return res.status(404).json({ message: 'Sala não encontrada.' })

    if (error.message === 'UNAUTHORIZED')
      return res.status(403).json({ message: 'Acesso negado.' })

    if (error.message === 'ROOM_NOT_WAITING')
      return res.status(400).json({ message: 'Sala não está aguardando.' })

    if (error.message === 'NO_COMPANIES')
      return res.status(400).json({ message: 'Nenhuma empresa na sala.' })

    return res.status(500).json({ message: 'Erro ao iniciar jogo.' })
  }
}

module.exports = {handleCreateRoom, handleGetRoom, handleCancelRoom, handleStartRoom}