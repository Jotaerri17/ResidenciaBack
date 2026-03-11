const Empresa = require('../models/empresa');

const EmpresaService = {
    async createempresa(dados) {
        if (!dados.name) {
            throw new Error("O nome é obrigatório!");
        }
        if (!dados.manager) {
            throw new Error("Nome do gerente é obrigatório!")
        }

        const empresaCriada = await Empresa.create({
            name: dados.name,
            manager: dados.manager,
        });
        return empresaCriada
    },
    async updatecaixa(empresaID, novoCaixa) {
        const empresa = await Empresa.findById(empresaID)
        if (!empresa) {
            throw new Error("Empresa não encontrada!");
        }
        empresa.caixa = novoCaixa
        await empresa.save()
        
        return empresa

    },
    async getempresaId(empresaID) {
        const empresa = await Empresa.findById(empresaID)
        if (!empresa) {
            throw new Error("Empresa não encontrada!");
        }
        return empresa
    }
};

module.exports = EmpresaService;
