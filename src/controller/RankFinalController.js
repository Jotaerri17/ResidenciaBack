const { calcularRankFinal } = require('../service/RankRoundFinal')

async function getRankFinal(req, res) {
    try {
        const { roomCode } = req.params

        const ranking = await calcularRankFinal(roomCode)

        return res.status(200).json({ ranking })
    } catch (error) {
        console.error('Erro ao calcular rank final:', error)
        return res.status(500).json({ error: 'Erro ao calcular rank final' })
    }
}

module.exports = { getRankFinal }