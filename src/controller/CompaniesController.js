const prisma = require('../lib/prisma')
const { joinRoom, getCompaniesByRoom, leaveRoom, getCompanySettings, } = require('../service/CompaniesService')

async function handleJoinRoom(req, res) {
  try {
    const { code, name, managerName } = req.body
    const io = req.app.get('io')

    if (!code || !name || !managerName) {
      return res.status(400).json({ message: 'code, name e managerName são obrigatórios.' })
    }

    const company = await joinRoom({ code, name, managerName }, io)

    return res.status(201).json({
      message: 'Empresa cadastrada com sucesso!',
      company,
    })
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ message: 'Sala não encontrada.' })
    }
    if (error.message === 'ROOM_NOT_AVAILABLE') {
      return res.status(400).json({ message: 'Sala não está disponível para entrar.' })
    }
    console.error(error)
    return res.status(500).json({ message: 'Erro ao entrar na sala.' })
  }
}

async function handleGetCompanies(req, res) {
  try {
    const { code } = req.params
    const companies = await getCompaniesByRoom(code)
    return res.status(200).json(companies)
  } catch (error) {
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
    const io = req.app.get('io')

    await leaveRoom({ companyId: id }, io)

    return res.status(200).json({ message: 'Empresa removida da sala com sucesso!' })
  } catch (error) {
    if (error.message === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({ message: 'Empresa não encontrada.' })
    }
    console.error(error)
    return res.status(500).json({ message: 'Erro ao sair da sala.' })
  }
}


async function handleGetCompanySettings(req, res) {
  try {
    const { id } = req.params;
    const settings = await getCompanySettings(id);
    return res.status(200).json(settings);
  } catch (error) {
    if (error.message === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({ message: 'Empresa não encontrada.' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Erro ao buscar configurações da empresa.' });
  }
}

module.exports = { handleJoinRoom, handleGetCompanies, handleLeaveRoom, handleGetCompanySettings}