const prisma = require('../lib/prisma')

/** Evita divisão por zero: retorna 0 quando denominador é 0 */
function safeDiv(num, den) {
  return den === 0 ? 0 : num / den
}

async function calcularDemanda(code, round) {
    const room = await prisma.room.findUnique({
        where: { code }
    })

    const [empresa, quiz] = await Promise.all([
        prisma.company.findMany({
            where: { roomId: room.id },
            include: {
                configs: { where: { round } },
                RoundResults: { where: { round: { lt: round } } },
            }
        }),
        prisma.quiz.findFirst({
            where: { roomId: room.id },
            include: { results: true }
        })
    ])

    const companyIds = empresa.map(e => e.id)

    // Configs de rodadas anteriores: soma total comprado (para calcular restante)
    const previousConfigsMap = await prisma.companyConfig.groupBy({
        by: ['companyId'],
        where: { companyId: { in: companyIds }, round: { lt: round } },
        _sum: {
            estoquePereciveis: true,
            estoqueMercearia: true,
            estoqueEletro: true,
            estoqueHipel: true,
        },
    })

    // Fallback: última config de cada empresa (para rodadas 3+ sem nova config)
    const latestConfigsRaw = await Promise.all(
        companyIds.map(id => prisma.companyConfig.findFirst({
            where: { companyId: id },
            orderBy: { round: 'desc' },
        }))
    )
    const latestConfigsMap = Object.fromEntries(
        companyIds.map((id, i) => [id, latestConfigsRaw[i]])
    )

    const quizMap = new Map(
        (quiz?.results ?? []).map((r) => [r.companyId, r.acertos])
    )
    const totalQuestions = quiz?.totalQuestions ?? 1

    const totalEmpresas = empresa.length

    const resultados = empresa.map(empresa => {
        const configDaRodada = empresa.configs[0]
        const isNovaConfig = !!configDaRodada
        // Se não há config para esta rodada, usa a última salva (rounds 3+)
        const config = configDaRodada || latestConfigsMap[empresa.id]

        // Estoque restante de rodadas anteriores
        const prevConfig = previousConfigsMap.find(p => p.companyId === empresa.id)
        const prevCompradoPereciveis = prevConfig?._sum?.estoquePereciveis ?? 0
        const prevCompradoMercearia  = prevConfig?._sum?.estoqueMercearia  ?? 0
        const prevCompradoEletro     = prevConfig?._sum?.estoqueEletro     ?? 0
        const prevCompradoHipel      = prevConfig?._sum?.estoqueHipel      ?? 0

        const prevVendidoPereciveis = empresa.RoundResults.reduce((s, r) => s + r.qtdVendidaPereciveis, 0)
        const prevVendidoMercearia  = empresa.RoundResults.reduce((s, r) => s + r.qtdVendidaMercearia,  0)
        const prevVendidoEletro     = empresa.RoundResults.reduce((s, r) => s + r.qtdVendidaEletro,     0)
        const prevVendidoHipel      = empresa.RoundResults.reduce((s, r) => s + r.qtdVendidaHipel,      0)

        const estoqueRestantePereciveis = Math.max(0, prevCompradoPereciveis - prevVendidoPereciveis)
        const estoqueRestanteMercearia  = Math.max(0, prevCompradoMercearia  - prevVendidoMercearia)
        const estoqueRestanteEletro     = Math.max(0, prevCompradoEletro     - prevVendidoEletro)
        const estoqueRestanteHipel      = Math.max(0, prevCompradoHipel      - prevVendidoHipel)

        // Estoque total: nova compra (só se for config da rodada atual) + restante de rodadas anteriores
        const novaCompraPereciveis = isNovaConfig ? (config.estoquePereciveis || 0) : 0
        const novaCompraMercearia  = isNovaConfig ? (config.estoqueMercearia  || 0) : 0
        const novaCompraEletro     = isNovaConfig ? (config.estoqueEletro     || 0) : 0
        const novaCompraHipel      = isNovaConfig ? (config.estoqueHipel      || 0) : 0

        const estoqueTotal = {
            pereciveis: novaCompraPereciveis + estoqueRestantePereciveis,
            mercearia:  novaCompraMercearia  + estoqueRestanteMercearia,
            eletro:     novaCompraEletro     + estoqueRestanteEletro,
            hipel:      novaCompraHipel      + estoqueRestanteHipel,
        }

        // preco medio da cesta
        const precoVendaPereciveis = room.custoUntPereciveis * (1 + config.margemPereciveis / 100)
        const precoVendaMercearia = room.custoUntMercearia * (1 + config.margemMercearia / 100)
        const precoVendaEletro = room.custoUntEletro * (1 + config.margemEletro / 100)
        const precoVendaHipel = room.custoUntHipel * (1 + config.margemHipel / 100)

        const precoMedioCesta = (
            precoVendaPereciveis +
            precoVendaMercearia +
            precoVendaEletro +
            precoVendaHipel
        ) 

        // disponibilidade — usa estoque total (comprado agora + restante de rodadas anteriores)
        const disponibilidadePereciveis = safeDiv(estoqueTotal.pereciveis, room.estoqueDisponivelPereciveis)
        const disponibilidadeMercearia  = safeDiv(estoqueTotal.mercearia,  room.estoqueDisponivelMercearia)
        const disponibilidadeEletro     = safeDiv(estoqueTotal.eletro,     room.estoqueDisponivelEletro)
        const disponibilidadeHipel      = safeDiv(estoqueTotal.hipel,      room.estoqueDisponivelHipel)

        const disponibilidade = (
            disponibilidadePereciveis +
            disponibilidadeMercearia +
            disponibilidadeHipel +
            disponibilidadeEletro
        ) / 4

        // csat
        const proporcaoOperadores = config.operadoresServico / 10
        const acertos = quizMap.get(empresa.id) ?? 0
        const proporcaoAcertos = acertos / totalQuestions
        const csat = parseFloat(((proporcaoOperadores * proporcaoAcertos) * 100).toFixed(2))

        return {
            empresaId: empresa.id,
            empresaNome: empresa.name,
            precoMedioCesta,
            disponibilidade: parseFloat((disponibilidade * 100).toFixed(2)),
            csat,
            precoVendaPereciveis,
            precoVendaMercearia,
            precoVendaEletro,
            precoVendaHipel,
            config: {
                ...config,
                estoquePereciveis: estoqueTotal.pereciveis,
                estoqueMercearia:  estoqueTotal.mercearia,
                estoqueEletro:     estoqueTotal.eletro,
                estoqueHipel:      estoqueTotal.hipel,
            }
        }
    })

    function rankear(lista, campo, menorEMelhor = false) {
        const ordenado = [...lista].sort((a, b) =>
            menorEMelhor ? a[campo] - b[campo] : b[campo] - a[campo]
        )
        // Constrói mapa posição → O(n) em vez de findIndex → O(n²)
        const posMap = new Map(ordenado.map((e, i) => [e.empresaId, i]))
        return lista.map(item => ({
            ...item,
            [`${campo}Pontos`]: totalEmpresas - posMap.get(item.empresaId)
        }))
    }

    // preço → menor é melhor
    let ranking = rankear(resultados, 'precoMedioCesta', true)
    // disponibilidade → maior é melhor
    ranking = rankear(ranking, 'disponibilidade', false)
    // csat → maior é melhor
    ranking = rankear(ranking, 'csat', false)

    const comPontosTotais = ranking.map(item => ({
        ...item,
        pontosTotais:
            item.precoMedioCestaPontos +
            item.disponibilidadePontos +
            item.csatPontos
    }))

    const somaTotalPontos = comPontosTotais.reduce(
        (acc, item) => acc + item.pontosTotais, 0
    )

    const demanda = comPontosTotais.map(item => ({
        empresaId: item.empresaId,
        empresaNome: item.empresaNome,
        precoMedioCesta: parseFloat(item.precoMedioCesta.toFixed(2)),
        disponibilidade: parseFloat(item.disponibilidade.toFixed(2)),
        csat: parseFloat(item.csat.toFixed(2)),
        precoMedioCestaPontos: item.precoMedioCestaPontos,
        disponibilidadePontos: item.disponibilidadePontos,
        csatPontos: item.csatPontos,
        pontosTotais: item.pontosTotais,
        // Proteção contra somaTotalPontos = 0: distribui igualmente entre empresas
        percentualDemanda: somaTotalPontos > 0
            ? parseFloat((item.pontosTotais / somaTotalPontos).toFixed(2))
            : parseFloat((1 / totalEmpresas).toFixed(2)),

        precoVendaPereciveis: parseFloat(item.precoVendaPereciveis.toFixed(2)),
        precoVendaMercearia:  parseFloat(item.precoVendaMercearia.toFixed(2)),
        precoVendaEletro:     parseFloat(item.precoVendaEletro.toFixed(2)),
        precoVendaHipel:      parseFloat(item.precoVendaHipel.toFixed(2)),
        config: item.config
    }))

    return demanda
}

module.exports = { calcularDemanda }
