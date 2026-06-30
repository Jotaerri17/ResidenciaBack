function calcularEbitda({receitaLiquida, custosTotais}){
    if (receitaLiquida === 0) return 0
    const ebitda = (receitaLiquida-custosTotais)/receitaLiquida*100

    return parseFloat(ebitda.toFixed(2))
}

module.exports = {calcularEbitda}