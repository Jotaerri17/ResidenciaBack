const { createRoom, getRoomByCode, cancelRoom, startRoom } = require('../service/RoomsService.js')
const prisma = require('../lib/prisma')


async function handleCreateRoom(req, res) {
  try {
    const { caixa, juros, totalRounds, quebrasPereciveis,
      quebrasMercearia, quebrasEletro, quebrasHipel, agingEletro, agingHipel, agingMercearia, agingPereciveis,
      custoUntPereciveis,
      custoUntMercearia,
      custoUntEletro,
      custoUntHipel,
      capexSegurancaValor,
      capexBalancaValor,
      capexFreezerValor,
      capexRedesValor,
      capexSiteValor,
      capexSelfCheckoutValor,
      capexMelhoriaContinuaValor,
      estoqueDisponivelPereciveis,
      estoqueDisponivelMercearia,
      estoqueDisponivelEletro,
      estoqueDisponivelHipel,
      demandaEstqRounds,
      impostoPereciveis, impostoMercearia, impostoEletro, impostoHipel, events } = req.body

    const room = await createRoom({
      caixa, juros, totalRounds, quebrasPereciveis,
      quebrasMercearia, quebrasEletro, quebrasHipel, agingEletro, agingHipel, agingMercearia, agingPereciveis,
      capexBalancaValor, capexFreezerValor, capexMelhoriaContinuaValor, capexRedesValor, capexSegurancaValor, capexSelfCheckoutValor, capexSiteValor,
      custoUntPereciveis, custoUntMercearia, custoUntHipel, custoUntEletro,
      estoqueDisponivelPereciveis,
      estoqueDisponivelMercearia,
      estoqueDisponivelEletro,
      estoqueDisponivelHipel,
      demandaEstqRounds,
      impostoPereciveis, impostoMercearia, impostoEletro, impostoHipel, events
    })

    return res.status(201).json({
      message: 'Sala criada com sucesso!',
      room,
      facilitadorToken: room.facilitatorToken
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


async function handleGetRank(req, res) {
  try {
    const { code, round } = req.params

    const rank = await prisma.roundResult.findMany({
      where: {
        round: parseInt(round),
        company: { room: { code } }
      },
      select: {
        id: true,
        round: true,
        receitaTotal: true,
        company: {
          select: {
            name: true,
            managerName: true,
          }
        }
      },
      orderBy: {
        receitaTotal: 'desc'
      }
    })

    return res.status(200).json(rank)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Erro ao buscar ranking.' })
  }
}

async function handleGetResultado(req, res) {
  try {
    const { code, round } = req.params
    const facilitatorToken = req.headers['x-facilitator-token']

    if (!facilitatorToken) {
      return res.status(401).json({ message: 'Token do facilitador obrigatório.' })
    }

    const room = await prisma.room.findUnique({ where: { code } })

    if (!room) {
      return res.status(404).json({ message: 'Sala não encontrada.' })
    }

    if (room.facilitatorToken !== facilitatorToken) {
      return res.status(403).json({ message: 'Acesso negado.' })
    }

    const resultado = await prisma.roundResult.findMany({
      where: {
        round: parseInt(round),
        company: { room: { code } }
      },
      include: {
        
        company: {
          select: {
            name: true,
            managerName: true,
            caixa: true,
            configs: {
              where: { round: parseInt(round) },
              select: {
                estoquePereciveis: true,
                estoqueMercearia: true,
                estoqueEletro: true,
                estoqueHipel: true,
                margemPereciveis: true,
                margemMercearia: true,
                margemEletro: true,
                margemHipel: true,
                operadoresVenda: true,
                operadoresServico: true,
                capexSeguranca: true,
                capexBalanca: true,
                capexRedes: true,
                capexSite: true,
                capexSelfCheckout: true,
                capexMelhoriaContinua: true,
              }
            }
          }
        }
      },
      orderBy: {
        receitaTotal: 'desc'
      }
    })

    return res.status(200).json(resultado)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Erro ao buscar resultado.' })
  }
}


module.exports = { handleCreateRoom, handleGetRoom, handleCancelRoom, handleStartRoom, handleGetRank, handleGetResultado }