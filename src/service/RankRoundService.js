const prisma = require('../lib/prisma')

const EVENTO_CAPEX_MAP = {
  EQUIPMENT_FAILURE: 'capexBalanca',
  SYSTEM_FAILURE: 'capexRedes',
  OTHER: 'capexMelhoriaContinua',
};

/**
 * @param {any[]} demanda
 * @param {string} roomCode
 * @param {number} round
 */

async function calcularRankRound(demanda, roomCode, round) {
    const room = await prisma.room.findUnique({
        where: { code: roomCode },
        include: { events: true}
    });
    const eventosRodada = room.events.filter(ev => ev.round === round);
    const percentualRound = room.demandaEstqRounds[round - 1] / 100

    const totalVendaPereciveis = room.estoqueDisponivelPereciveis * percentualRound
    const totalVendaMercearia = room.estoqueDisponivelMercearia * percentualRound
    const totalVendaEletro = room.estoqueDisponivelEletro * percentualRound
    const totalVendaHipel = room.estoqueDisponivelHipel * percentualRound

    const resultado = await Promise.all(
        demanda.map(async item => {

            const qtdVendidaPereciveis = Math.min(
                totalVendaPereciveis * item.percentualDemanda,
                item.config.estoquePereciveis
            )
            const qtdVendidaMercearia = Math.min(
                totalVendaMercearia * item.percentualDemanda,
                item.config.estoqueMercearia
            )
            const qtdVendidaEletro = Math.min(
                totalVendaEletro * item.percentualDemanda,
                item.config.estoqueEletro
            )
            const qtdVendidaHipel = Math.min(
                totalVendaHipel * item.percentualDemanda,
                item.config.estoqueHipel
            )

            // nao vendeu 
            const deixouDeVenderPereciveis = Math.max(
                0,
                (totalVendaPereciveis * item.percentualDemanda) - item.config.estoquePereciveis
            )
            const deixouDeVenderMercearia = Math.max(
                0,
                (totalVendaMercearia * item.percentualDemanda) - item.config.estoqueMercearia
            )
            const deixouDeVenderEletro = Math.max(
                0,
                (totalVendaEletro * item.percentualDemanda) - item.config.estoqueEletro
            )
            const deixouDeVenderHipel = Math.max(
                0,
                (totalVendaHipel * item.percentualDemanda) - item.config.estoqueHipel
            )
            // receita
            const receitaPereciveis = qtdVendidaPereciveis * item.precoVendaPereciveis
            const receitaMercearia = qtdVendidaMercearia * item.precoVendaMercearia
            const receitaEletro = qtdVendidaEletro * item.precoVendaEletro
            const receitaHipel = qtdVendidaHipel * item.precoVendaHipel

            const receitaTotal = receitaPereciveis + receitaMercearia + receitaEletro + receitaHipel

            // Penalidade por eventos sem CAPEX
            let penalidade = 0;
            eventosRodada.forEach(evento => {
            const capexField = EVENTO_CAPEX_MAP[evento.type]; 

            if (capexField && !item.config[capexField]) {
                penalidade += 0.1; // Exemplo: 10% PERGUNTAR SE É EDITAVEL OU FIXO E VALOR
            }
            });
            const receitaTotalComPenalidade = receitaTotal * (1 - penalidade);

            const r2 = (n) => parseFloat(n.toFixed(2))
            await prisma.roundResult.create({
                data: {
                    companyId: item.empresaId,
                    round,
                    qtdVendidaPereciveis:      r2(qtdVendidaPereciveis),
                    qtdVendidaMercearia:       r2(qtdVendidaMercearia),
                    qtdVendidaEletro:          r2(qtdVendidaEletro),
                    qtdVendidaHipel:           r2(qtdVendidaHipel),
                    deixouDeVenderPereciveis:  r2(deixouDeVenderPereciveis),
                    deixouDeVenderMercearia:   r2(deixouDeVenderMercearia),
                    deixouDeVenderEletro:      r2(deixouDeVenderEletro),
                    deixouDeVenderHipel:       r2(deixouDeVenderHipel),
                    receitaPereciveis:         r2(receitaPereciveis),
                    receitaMercearia:          r2(receitaMercearia),
                    receitaEletro:             r2(receitaEletro),
                    receitaHipel:              r2(receitaHipel),
                    receitaTotal:              r2(receitaTotalComPenalidade),
                    precoMedioCesta:           r2(item.precoMedioCesta),
                    disponibilidade:           r2(item.disponibilidade),
                    csat:                      r2(item.csat),
                    percentualDemanda:         r2(item.percentualDemanda),
                    precoMedioCestaPontos:     item.precoMedioCestaPontos,
                    disponibilidadePontos:     item.disponibilidadePontos,
                    csatPontos:               item.csatPontos,
                    pontosTotais:             item.pontosTotais,
                }
            })
            return {
                empresaId: item.empresaId,
                empresaNome: item.empresaNome,
                precoMedioCesta: item.precoMedioCesta,
                disponibilidade: item.disponibilidade,
                csat: item.csat,
                precoMedioCestaPontos: item.precoMedioCestaPontos,
                disponibilidadePontos: item.disponibilidadePontos,
                csatPontos: item.csatPontos,
                pontosTotais: item.pontosTotais,
                percentualDemanda: (item.percentualDemanda * 100).toFixed(2),
                precoVendaPereciveis: item.precoVendaPereciveis,
                precoVendaMercearia: item.precoVendaMercearia,
                precoVendaEletro: item.precoVendaEletro,
                precoVendaHipel: item.precoVendaHipel,
                qtdVendidaPereciveis,
                qtdVendidaMercearia,
                qtdVendidaEletro,
                qtdVendidaHipel,
                deixouDeVenderPereciveis,
                deixouDeVenderMercearia,
                deixouDeVenderEletro,
                deixouDeVenderHipel,
                receitaPereciveis,
                receitaMercearia,
                receitaEletro,
                receitaHipel,
                receitaTotal: receitaTotalComPenalidade,
            }
            })
    )
    console.log('Ranking do round:', JSON.stringify(resultado, null, 2))
    return resultado.sort((a, b) => b.receitaTotal - a.receitaTotal)

}

module.exports = { calcularRankRound }