function calcularEbitda({receitaLiquida, custosTotais}){
    const ebitda = (receitaLiquida-custosTotais)/receitaLiquida*100

    return parseFloat(ebitda.toFixed(2))
}

module.exports = {calcularEbitda}