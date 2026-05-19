const prisma = require('../lib/prisma')

async function calcularRankFinal(roomCode) {
    const [room, companies] = await Promise.all([
        prisma.room.findUnique({ where: { code: roomCode } }),
        prisma.company.findMany({
            where: { room: { code: roomCode } },
            include: {
                RoundResults: true,
                configs: true,
            },
        }),
    ])

    const ranking = companies.map(company => {
        // EBITDA acumulado das rodadas
        const totalReceita = company.RoundResults.reduce((s, r) => s + r.receitaTotal, 0)
        const totalCustos  = company.RoundResults.reduce((s, r) => s + r.receitaTotal * (1 - r.ebitda / 100), 0)

        // Estoque não vendido acumulado (comprado - vendido em todas as rodadas)
        const totalComprado = (campo) => company.configs.reduce((s, c) => s + (c[campo] || 0), 0)
        const totalVendido  = (campo) => company.RoundResults.reduce((s, r) => s + (r[campo] || 0), 0)

        const naoVendidoPereciveis = Math.max(0, totalComprado('estoquePereciveis') - totalVendido('qtdVendidaPereciveis'))
        const naoVendidoMercearia  = Math.max(0, totalComprado('estoqueMercearia')  - totalVendido('qtdVendidaMercearia'))
        const naoVendidoEletro     = Math.max(0, totalComprado('estoqueEletro')     - totalVendido('qtdVendidaEletro'))
        const naoVendidoHipel      = Math.max(0, totalComprado('estoqueHipel')      - totalVendido('qtdVendidaHipel'))

        // Custo de aging + quebras sobre estoque não vendido (apenas na rodada final)
        const custoAgingQuebras =
            naoVendidoPereciveis * room.custoUntPereciveis * (room.agingPereciveis + room.quebrasPereciveis) / 100 +
            naoVendidoMercearia  * room.custoUntMercearia  * (room.agingMercearia  + room.quebrasMercearia)  / 100 +
            naoVendidoEletro     * room.custoUntEletro     * (room.agingEletro     + room.quebrasEletro)     / 100 +
            naoVendidoHipel      * room.custoUntHipel      * (room.agingHipel      + room.quebrasHipel)      / 100

        const ebitdaFinal = totalReceita > 0
            ? parseFloat(((totalReceita - totalCustos - custoAgingQuebras) / totalReceita * 100).toFixed(2))
            : 0

        return {
            empresaId: company.id,
            empresaNome: company.name,
            managerName: company.managerName,
            ebitdaAcumulado: ebitdaFinal,
            custoAgingQuebras: parseFloat(custoAgingQuebras.toFixed(2)),
        }
    })

    return ranking.sort((a, b) => b.ebitdaAcumulado - a.ebitdaAcumulado)
}
module.exports = {calcularRankFinal};