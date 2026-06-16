const { createRoom, getRoomByCode, cancelRoom, startRoom, nextRound, finishGame } = require('../service/RoomsService.js')
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

    // Valida campos obrigatórios
    const requiredFields = [
      'custoUntPereciveis', 'custoUntMercearia', 'custoUntEletro', 'custoUntHipel',
      'estoqueDisponivelPereciveis', 'estoqueDisponivelMercearia', 'estoqueDisponivelEletro', 'estoqueDisponivelHipel'
    ]
    const missing = requiredFields.filter(f => req.body[f] === undefined || req.body[f] === null)
    if (missing.length > 0) {
      return res.status(400).json({ message: `Campos obrigatórios faltando: ${missing.join(', ')}` })
    }
    const invalidType = requiredFields.filter(f => typeof req.body[f] !== 'number' || isNaN(req.body[f]))
    if (invalidType.length > 0) {
      return res.status(400).json({ message: `Campos devem ser numéricos: ${invalidType.join(', ')}` })
    }
    const negativeFields = requiredFields.filter(f => req.body[f] < 0)
    if (negativeFields.length > 0) {
      return res.status(400).json({ message: `Campos não podem ser negativos: ${negativeFields.join(', ')}` })
    }

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
    const facilitatorToken = req.headers['x-facilitator-token']

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
    const roundNum = parseInt(round)
    if (isNaN(roundNum) || roundNum < 1) {
      return res.status(400).json({ message: 'Parâmetro round inválido.' })
    }
    const companyId = req.query.companyId || req.query.companyID

    const rank = await prisma.roundResult.findMany({
      where: {
        round: roundNum,
        company: { room: { code } }
      },
      select: {
        round: true,
        receitaTotal: true,
        company: {
          select: {
            id:true,
            name: true,
            managerName: true,
          }
        }
      },
      orderBy: {
        receitaTotal: 'desc'
      }
    })
    let meuResultado = null
    if(companyId) {
      meuResultado = await prisma.roundResult.findUnique({
        where: {
          companyId_round: {
            companyId,
            round: roundNum
          }
        },
        select: {
          precoMedioCesta: true,
          disponibilidade: true,
          csat: true,
          percentualDemanda: true,
          qtdVendidaPereciveis: true,
          qtdVendidaMercearia: true,
          qtdVendidaEletro: true,
          qtdVendidaHipel: true,
          deixouDeVenderPereciveis: true,
          deixouDeVenderMercearia: true,
          deixouDeVenderEletro: true,
          deixouDeVenderHipel: true,
          receitaPereciveis: true,
          receitaMercearia: true,
          receitaHipel: true,
          receitaEletro: true,
          receitaTotal: true,

        }
      })
    }
    if (meuResultado) {
      const receitaBruta =
        meuResultado.receitaPereciveis +
        meuResultado.receitaMercearia +
        meuResultado.receitaEletro +
        meuResultado.receitaHipel
      
      const valorPenalidade = receitaBruta - meuResultado.receitaTotal

      const percentualPenalidade = 
        receitaBruta > 0 ? (valorPenalidade / receitaBruta) * 100 : 0

      const [eventosDaRodada, configsAnteriores] = await Promise.all([
        prisma.roomEvent.findMany({
          where: { room: { code }, round: roundNum },
          select: { type: true }
        }),
        prisma.companyConfig.findMany({
          where: { companyId, round: { lte: roundNum } },
          select: {
            capexSeguranca: true,
            capexBalanca: true,
            capexRedes: true,
            capexSite: true,
            capexSelfCheckout: true,
            capexMelhoriaContinua: true,
          }
        })
      ])
      const eventosAplicados = eventosDaRodada.map(e => e.type)

      // CAPEX é cumulativo: protegido se comprou em qualquer rodada até a atual
      const capexAcumulado = configsAnteriores.reduce((acc, cfg) => {
        for (const key of Object.keys(cfg)) {
          if (cfg[key]) acc[key] = true
        }
        return acc
      }, {})

      meuResultado = {
        ...meuResultado,
        receitaBruta,
        valorPenalidade,
        percentualPenalidade,
        eventosAplicados,
        config: capexAcumulado,
      }
    }

    return res.status(200).json({ rank, meuResultado })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Erro ao buscar ranking.' })
  }
}

async function handleGetResultado(req, res) {
  try {
    const { code, round } = req.params
    const roundNum = parseInt(round)
    if (isNaN(roundNum) || roundNum < 1) {
      return res.status(400).json({ message: 'Parâmetro round inválido.' })
    }
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
        round: roundNum,
        company: { room: { code } }
      },
      include: {
        
        company: {
          select: {
            id: true,
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

    const companyIds = resultado.map(r => r.company.id ?? r.companyId).filter(Boolean)

    const [eventosDaRodada, allCapexConfigs] = await Promise.all([
      prisma.roomEvent.findMany({
        where: { roomId: room.id, round: roundNum },
        select: { type: true }
      }),
      prisma.companyConfig.findMany({
        where: { companyId: { in: companyIds }, round: { lte: roundNum } },
        select: {
          companyId: true,
          capexSeguranca: true,
          capexBalanca: true,
          capexRedes: true,
          capexSite: true,
          capexSelfCheckout: true,
          capexMelhoriaContinua: true,
        }
      })
    ])

    // Acumula CAPEX por empresa: uma vez comprado, protege para sempre
    const capexAcumuladoMap = {}
    for (const cfg of allCapexConfigs) {
      const acc = capexAcumuladoMap[cfg.companyId] || {}
      if (cfg.capexSeguranca)        acc.capexSeguranca        = true
      if (cfg.capexBalanca)          acc.capexBalanca          = true
      if (cfg.capexRedes)            acc.capexRedes            = true
      if (cfg.capexSite)             acc.capexSite             = true
      if (cfg.capexSelfCheckout)     acc.capexSelfCheckout     = true
      if (cfg.capexMelhoriaContinua) acc.capexMelhoriaContinua = true
      capexAcumuladoMap[cfg.companyId] = acc
    }

    const eventosAplicados = eventosDaRodada.map(e => e.type)

    const resultadoFinal = resultado.map(item => {
      const receitaBruta =
        item.receitaPereciveis +
        item.receitaMercearia +
        item.receitaEletro +
        item.receitaHipel

      const valorPenalidade = receitaBruta - item.receitaTotal
      const percentualPenalidade = receitaBruta > 0 ? (valorPenalidade / receitaBruta) * 100 : 0
      const cid = item.company?.id ?? item.companyId

      return {
        ...item,
        receitaBruta,
        valorPenalidade,
        percentualPenalidade,
        eventosAplicados,
        capexAcumulado: capexAcumuladoMap[cid] || {},
      }
    })

    return res.status(200).json(resultadoFinal)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Erro ao buscar resultado.' })
  }
}

async function handleNextRound(req, res) {
  try {
    const { code } = req.params
    const facilitatorToken = req.headers['x-facilitator-token'] || req.headers['x-facilitador-token']
    const io = req.app.get('io')

    if (!facilitatorToken) {
      return res.status(401).json({ message: 'Token do facilitador obrigatório.' })
    }

    const room = await nextRound({ code, facilitatorToken }, io)

    return res.status(200).json({
      message: `Rodada ${room.currentRound} iniciada com sucesso!`,
      room,
    })

  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND')
      return res.status(404).json({ message: 'Sala não encontrada.' })
    if (error.message === 'UNAUTHORIZED')
      return res.status(403).json({ message: 'Acesso negado.' })
    if (error.message === 'ROOM_NOT_IN_PROGRESS')
      return res.status(400).json({ message: 'O jogo não está em andamento.' })
    if (error.message === 'ROOM_MAX_ROUNDS_REACHED')
      return res.status(400).json({ message: 'Todas as rodadas já foram concluídas.' })
    console.error(error)
    return res.status(500).json({ message: 'Erro ao avançar rodada.' })
  }
}
async function handleFinishGame(req, res) {
  try {
    const { code } = req.params
    const facilitatorToken = req.headers['x-facilitator-token'] || req.headers['x-facilitador-token']
    const io = req.app.get('io')

    if (!facilitatorToken) {
      return res.status(401).json({ message: 'Token do facilitador obrigatório.' })
    }

    const resultado = await finishGame({ code, facilitatorToken }, io)

    return res.status(200).json({
      message: 'Jogo encerrado com sucesso!',
      ...resultado
    })

  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND')
      return res.status(404).json({ message: 'Sala não encontrada.' })
    if (error.message === 'UNAUTHORIZED')
      return res.status(403).json({ message: 'Acesso negado.' })
    if (error.message === 'ROOM_NOT_IN_PROGRESS')
      return res.status(400).json({ message: 'O jogo não está em andamento.' })
    console.error(error)
    return res.status(500).json({ message: 'Erro ao encerrar jogo.' })
  }
}

module.exports = { handleCreateRoom, handleGetRoom, handleCancelRoom, handleStartRoom, handleGetRank, handleGetResultado, handleNextRound, handleFinishGame }