const { config } = require('dotenv')
const prisma = require('../lib/prisma')

async function calcularDemanda(code, round) {
    const room = await prisma.room.findUnique({
        where: { code }
    })
    const empresa = await prisma.company.findMany({
        where: { roomId: room.id },
        include: {
            configs: {
                where: { round }
            },
        }


    })
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

        // disponibilidade 
        const disponibilidadePereciveis = config.estoquePereciveis / room.estoqueDisponivelPereciveis
        const disponibilidadeMercearia = config.estoqueMercearia / room.estoqueDisponivelMercearia
        const disponibilidadeEletro = config.estoqueEletro / room.estoqueDisponivelEletro
        const disponibilidadeHipel = config.estoqueHipel / room.estoqueDisponivelHipel

        const disponibilidade = (
            disponibilidadePereciveis +
            disponibilidadeMercearia +
            disponibilidadeHipel +
            disponibilidadeEletro
        ) / 4

        //csat
        // depois trocar para o config de acertosdoquestionario
        const proporcaoOperadores = config.operadoresServico / 10
        const proporcaoAcertos = 10 / 10
        const csat = parseFloat(((proporcaoOperadores * proporcaoAcertos) * 100).toFixed(2))

        return {
            empresaId: empresa.id,
            empresaNome: empresa.name,
            precoMedioCesta,
            disponibilidade: parseFloat((disponibilidade * 100).toFixed(2)),
            csat,
            precoVendaPereciveis,      // ← Adicione aqui
            precoVendaMercearia,        // ← Adicione aqui
            precoVendaEletro,           // ← Adicione aqui
            precoVendaHipel,            // ← Adicione aqui
            config
        }

    })
    const totalEmpresas = resultados.length

    function rankear(lista, campo, menorEMelhor = false) {
        const ordenado = [...lista].sort((a, b) =>
            menorEMelhor ? a[campo] - b[campo] : b[campo] - a[campo]
        )
        return lista.map(item => {
            const posicao = ordenado.findIndex(e => e.empresaId === item.empresaId)
            return {
                ...item,
                [`${campo}Pontos`]: totalEmpresas - posicao // melhor = totalEmpresas, pior = 1
            }
        })
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
        percentualDemanda: parseFloat((item.pontosTotais / somaTotalPontos).toFixed(2)),

        precoVendaPereciveis: parseFloat(item.precoVendaPereciveis.toFixed(2)),
        precoVendaMercearia: parseFloat(item.precoVendaMercearia.toFixed(2)),
        precoVendaEletro: parseFloat(item.precoVendaEletro.toFixed(2)),
        precoVendaHipel: parseFloat(item.precoVendaHipel.toFixed(2)),
        config: item.config

    }))
    console.log(demanda)
    return demanda
}

module.exports = { calcularDemanda }
