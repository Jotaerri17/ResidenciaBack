const prisma = require('../lib/prisma');
//const item = require('../models/item');
const { get } = require('../routes/RoomsRoutes');

function obterSlaDiasPorOperadores(operadoresServico) {
    
    if (operadoresServico <= 0) return 6;
    if (operadoresServico === 1) return 5;
    if (operadoresServico === 2) return 4;
    if (operadoresServico === 3) return 3;
    if (operadoresServico === 4) return 2;

    return 1;
    
}

function calcularDiasSemVenda(eventosRodada, configEmpresa) {
    const slaDias = obterSlaDiasPorOperadores(configEmpresa.operadoresServico);
    let diasSemVenda = 0;

    eventosRodada.forEach((evento) => {
       const capexField = EVENTO_CAPEX_MAP[evento.type];
       const diasBase = CAPEX_DIAS_BASE_MAP[capexField] ?? 0; 
         if (capexField && diasBase > 0 && !configEmpresa[capexField]) {
            diasSemVenda += slaDias + diasBase;
        }
    
    });
    
    return diasSemVenda;
}

function calcularFatorPenalidade(diasSemVenda, diasReferencia) {
    if (diasReferencia <= 0) return 0;
    return Math.min(1, Math.max(0, diasSemVenda / diasReferencia));
}

function calcularVendaComPenalidade(demandaPotencial, estoque, preco, fatorPenalidade) {
    const qtdVendidaSemPenalidade = Math.min(demandaPotencial, estoque);
    const descontoUnidades = qtdVendidaSemPenalidade * fatorPenalidade;
    const qtdVendida = Math.max(0, qtdVendidaSemPenalidade - descontoUnidades);
    const deixouDeVender = Math.max(0, demandaPotencial - qtdVendida);
    const receita = qtdVendida * preco;
    const receitaSemPenalidade = qtdVendidaSemPenalidade * preco;

    return {
        qtdVendida,
        deixouDeVender,
        receita,
        receitaSemPenalidade,
    };
}

// Fator relativo da penalidade sobre o volume da rodada (configurável por ambiente).
const DIAS_REFERENCIA_PENALIDADE = Number(process.env.DIAS_REFERENCIA_PENALIDADE || 30);


const CAPEX_DIAS_BASE_MAP = {
    capexSeguranca: 2,
    capexBalanca: 1,
    capexRedes: 2,
    capexSite: 1,
    capexSelfCheckout: 2,
    capexMelhoriaContinua: 0,
}

const EVENTO_CAPEX_MAP = {
    SEGURANCA: 'capexSeguranca',
    BALANCA_FREEZER: 'capexBalanca',
    REDES: 'capexRedes',
    SITE: 'capexSite',
    SELF_CHECKOUT: 'capexSelfCheckout',
    MELHORIA_CONTINUA: 'capexMelhoriaContinua',
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
    if (!room) {
        throw new Error('Sala não encontrada');
    }
    const eventosRodada = room.events.filter(ev => ev.round === round);
    const percentualRound = room.demandaEstqRounds[round - 1] / 100

    const totalVendaPereciveis = room.estoqueDisponivelPereciveis * percentualRound
    const totalVendaMercearia = room.estoqueDisponivelMercearia * percentualRound
    const totalVendaEletro = room.estoqueDisponivelEletro * percentualRound
    const totalVendaHipel = room.estoqueDisponivelHipel * percentualRound

    const resultado = await Promise.all(
        demanda.map(async item => {
            const diasSemVenda = calcularDiasSemVenda(eventosRodada, item.config);
            const fatorPenalidade = calcularFatorPenalidade(diasSemVenda, DIAS_REFERENCIA_PENALIDADE);
            
            const demandaPotencialPereciveis = totalVendaPereciveis * item.percentualDemanda;
            const demandaPotencialMercearia = totalVendaMercearia * item.percentualDemanda;
            const demandaPotencialEletro = totalVendaEletro * item.percentualDemanda;
            const demandaPotencialHipel = totalVendaHipel * item.percentualDemanda;

            const vendaPereciveis = calcularVendaComPenalidade(
                demandaPotencialPereciveis,
                item.config.estoquePereciveis,
                item.precoVendaPereciveis,
                fatorPenalidade
            );
            const vendaMercearia = calcularVendaComPenalidade(
                demandaPotencialMercearia,
                item.config.estoqueMercearia,
                item.precoVendaMercearia,
                fatorPenalidade
            );
            const vendaEletro = calcularVendaComPenalidade(
                demandaPotencialEletro,
                item.config.estoqueEletro,
                item.precoVendaEletro,
                fatorPenalidade
            );
            const vendaHipel = calcularVendaComPenalidade(
                demandaPotencialHipel,
                item.config.estoqueHipel,
                item.precoVendaHipel,
                fatorPenalidade
            );

            const qtdVendidaPereciveis = vendaPereciveis.qtdVendida;
            const qtdVendidaMercearia = vendaMercearia.qtdVendida;
            const qtdVendidaEletro = vendaEletro.qtdVendida;
            const qtdVendidaHipel = vendaHipel.qtdVendida;

            const deixouDeVenderPereciveis = vendaPereciveis.deixouDeVender;
            const deixouDeVenderMercearia = vendaMercearia.deixouDeVender;
            const deixouDeVenderEletro = vendaEletro.deixouDeVender;
            const deixouDeVenderHipel = vendaHipel.deixouDeVender;

            const receitaPereciveis = vendaPereciveis.receita;
            const receitaMercearia = vendaMercearia.receita;
            const receitaEletro = vendaEletro.receita;
            const receitaHipel = vendaHipel.receita;

            const receitaBruta =
                vendaPereciveis.receitaSemPenalidade +
                vendaMercearia.receitaSemPenalidade +
                vendaEletro.receitaSemPenalidade +
                vendaHipel.receitaSemPenalidade;

            const receitaFinal = receitaPereciveis + receitaMercearia + receitaEletro + receitaHipel;
            const valorPenalidade = Math.max(0, receitaBruta - receitaFinal);
            const percentualPenalidade = receitaBruta > 0 ? valorPenalidade / receitaBruta : 0;


            let eventosAplicados = [];
            eventosRodada.forEach(evento => {
            const capexField = EVENTO_CAPEX_MAP[evento.type];
            if (capexField && !item.config[capexField]) {
                eventosAplicados.push(evento.type);
            }
            });

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
                    precoMedioCesta:           r2(item.precoMedioCesta),
                    disponibilidade:           r2(item.disponibilidade),
                    csat:                      r2(item.csat),
                    percentualDemanda:         r2(item.percentualDemanda),
                    precoMedioCestaPontos:     item.precoMedioCestaPontos,
                    disponibilidadePontos:     item.disponibilidadePontos,
                    csatPontos:               item.csatPontos,
                    pontosTotais:             item.pontosTotais,
                    receitaTotal: r2(receitaFinal),
                    diasSemVenda,
                    eventosAplicados,
                    valorPenalidade: r2(valorPenalidade),
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
                receitaBruta: receitaBruta,
                receitaTotal: receitaFinal,
                percentualPenalidade: percentualPenalidade,
                diasSemVenda,
                eventosAplicados,
                valorPenalidade,
            }
            })
    )
    console.log('Ranking do round:', JSON.stringify(resultado, null, 2))
    return resultado.sort((a, b) => b.receitaTotal - a.receitaTotal)

}

module.exports = { calcularRankRound }