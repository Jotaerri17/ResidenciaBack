const EmpresaService = require('../service/EmpresaService.js')

const EmpresaController = {
    async create(req, res){
        try{
            const empresa = await EmpresaService.createempresa(req.body);
            res.status(201).json({
                mensagem: "Empresa cadastrada com sucesso!",
                empresaId: empresa._id
            });

        }catch(error){
            res.status(400).json({error: error.message})
        }
    },
    async getById(req ,res){
        try{
            const empresa = await EmpresaService.getempresaId(req.body)
            res.status(201).json({
                result: empresa
            })
        } catch(error){
            res.status(400).json({ error: error.message})
        }
    }
}
module.exports = EmpresaController