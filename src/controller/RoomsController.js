const { createRoom, getRoomByCode }= require ('../service/RoomsService.js')

async function handleCreateRoom(req, res) {
  try {
    const { caixa, juros, totalRounds, quebrasPereciveis,
    quebrasMercearia, quebrasEletro,quebrasHipel,agingEletro,agingHipel,agingMercearia,agingPereciveis, 
    impostoPereciveis, impostoMercearia, impostoEletro, impostoHipel, events } = req.body

    const room = await createRoom({ caixa, juros, totalRounds, quebrasPereciveis,
    quebrasMercearia, quebrasEletro,quebrasHipel,agingEletro,agingHipel,agingMercearia,agingPereciveis, 
    impostoPereciveis, impostoMercearia, impostoEletro, impostoHipel, events})

    return res.status(201).json({
      message: 'Sala criada com sucesso!',
      room,
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

module.exports = {handleCreateRoom, handleGetRoom}