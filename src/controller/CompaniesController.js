const prisma = require('../lib/prisma')
const { joinRoom, getCompaniesByRoom , leaveRoom} = require('../service/CompaniesService.js')

async function handleJoinRoom(req, res) {
    try {
        const { code, name, managerName } = req.body
        if (!code || !name || !managerName) {
            return res.status(400).json({
                message: "falta um campo obrigatório"
            })
        }
        const company = await joinRoom({ code, name, managerName })
        return res.status(201).json({
            message: "Conectou-se a sala",
            companyId: company.id
        })
    } catch (error) {
        if (error.message === 'ROOM_NOT_FOUND') {
            return res.status(404).json({
                message: "sala não encontrada"
            })
        }
        if (error.message === 'ROOM_NOT_AVALIABLE') {
            return res.status(400).json({
                message: "Sala não está disponível para entrar."
            })
        }
        console.error(error)
        return res.status(500).json({ message: 'Erro ao entrar na sala.' })
    }
}

async function handleGetCompanies(req, res) {
    try{
        const { code } = req.params
        const companies = await getCompaniesByRoom(code)
        return res.status(200).json(companies)
    }catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ message: 'Sala não encontrada.' })
    }
    console.error(error)
    return res.status(500).json({ message: 'Erro ao buscar empresas.' })
  }
}
async function handleLeaveRoom(req, res) {
  try {
    const { id } = req.params

    await leaveRoom({ companyId: id })

    return res.status(200).json({ message: 'Removido da sala com sucesso!' })
  } catch (error) {
    if (error.message === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({ message: 'Empresa não encontrada.' })
    }
    console.error(error)
    return res.status(500).json({ message: 'Erro ao sair da sala.' })
  }
}

module.exports = { handleJoinRoom, handleGetCompanies, handleLeaveRoom }
    
