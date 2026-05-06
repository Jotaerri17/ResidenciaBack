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
            include: { configs: { where: { round } } }
        }),
        prisma.quiz.findFirst({
            where: { roomId: room.id },
            include: { results: true }
        })
    ])

    const quizMap = new Map(
        (quiz?.results ?? []).map((r) => [r.companyId, r.acertos])
    )
    const totalQuestions = quiz?.totalQuestions ?? 1

    const totalEmpresas = empresa.length

    const resultados = empresa.map(empresa => {
        const config = empresa.configs[0]

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
        ) / 4

        // disponibilidade — protegida contra divisão por zero
        const disponibilidadePereciveis = safeDiv(config.estoquePereciveis, room.estoqueDisponivelPereciveis)
        const disponibilidadeMercearia  = safeDiv(config.estoqueMercearia,  room.estoqueDisponivelMercearia)
        const disponibilidadeEletro     = safeDiv(config.estoqueEletro,     room.estoqueDisponivelEletro)
        const disponibilidadeHipel      = safeDiv(config.estoqueHipel,      room.estoqueDisponivelHipel)

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
            config
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
