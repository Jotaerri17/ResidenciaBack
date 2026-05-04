const prisma = require('../lib/prisma')

async function calcularRankFinal(roomCode) {
    const companies = await prisma.company.findMany({
        where: { room: { code: roomCode } },
        include: { RoundResults: true }
    })

    const ranking = companies.map(company => {
        const ebitdaAcumulado = company.RoundResults.reduce(
            (acc, r) => acc + r.ebitda,
            0
        )
        return {
            empresaId: company.id,
            empresaNome: company.name,
            ebitdaAcumulado: parseFloat(ebitdaAcumulado.toFixed(2)),
        }
    })

    return ranking.sort((a, b) => b.ebitdaAcumulado - a.ebitdaAcumulado)
}
module.exports = {calcularRankFinal};