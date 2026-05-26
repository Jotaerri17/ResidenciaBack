const prisma = require('../lib/prisma')

async function joinRoom({ code, name, managerName }, io) {
  const room = await prisma.room.findUnique({
    where: { code },
  })

  if (!room) {
    throw new Error('ROOM_NOT_FOUND')
  }

  if (room.status !== 'WAITING') {
    throw new Error('ROOM_NOT_AVAILABLE')
  }

  const company = await prisma.company.create({
    data: {
      roomId: room.id,
      name,
      managerName,
      caixa: room.caixa,
    },
  })

  // busca todas as empresas atualizadas da sala
  const companies = await prisma.company.findMany({
    where: { roomId: room.id },
  })

  // emite para todos na sala
  io.to(code).emit('companies_updated', companies)

  return company
}

async function getCompaniesByRoom(code) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { companies: true },
  })

  if (!room) {
    throw new Error('ROOM_NOT_FOUND')
  }

  return room.companies
}

async function leaveRoom({ companyId, facilitatorToken }, io) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { room: true },
  })

  if (!company) {
    throw new Error('COMPANY_NOT_FOUND')
  }

  if (company.room.facilitatorToken !== facilitatorToken) {
    throw new Error('UNAUTHORIZED')
  }

  await prisma.company.delete({
    where: { id: companyId },
  })

  // busca empresas restantes
  const companies = await prisma.company.findMany({
    where: { roomId: company.roomId },
  })

  // emite para todos na sala
  io.to(company.room.code).emit('companies_updated', companies)
}

async function getCompanySettings(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { room: true },
  });

  if (!company) throw new Error('COMPANY_NOT_FOUND');

  const room = company.room;

  const [configs, results] = await Promise.all([
    prisma.companyConfig.findMany({ where: { companyId } }),
    prisma.roundResult.findMany({ where: { companyId } }),
  ]);

  const totalComprado = (campo) => configs.reduce((sum, c) => sum + (c[campo] || 0), 0);
  const totalVendido  = (campo) => results.reduce((sum, r) => sum + (r[campo] || 0), 0);

  const estoqueAtualPereciveis = Math.max(0, totalComprado('estoquePereciveis') - totalVendido('qtdVendidaPereciveis'));
  const estoqueAtualMercearia  = Math.max(0, totalComprado('estoqueMercearia')  - totalVendido('qtdVendidaMercearia'));
  const estoqueAtualEletro     = Math.max(0, totalComprado('estoqueEletro')     - totalVendido('qtdVendidaEletro'));
  const estoqueAtualHipel      = Math.max(0, totalComprado('estoqueHipel')      - totalVendido('qtdVendidaHipel'));

  return {
    saldoInicial: company.caixa,
    estoqueAtualPereciveis,
    estoqueAtualMercearia,
    estoqueAtualEletro,
    estoqueAtualHipel,
    estoqueJaCompradoPereciveis: totalComprado('estoquePereciveis'),
    estoqueJaCompradoMercearia:  totalComprado('estoqueMercearia'),
    estoqueJaCompradoEletro:     totalComprado('estoqueEletro'),
    estoqueJaCompradoHipel:      totalComprado('estoqueHipel'),
    juros: room.juros,
    custoUntPereciveis: room.custoUntPereciveis,
    custoUntMercearia: room.custoUntMercearia,
    custoUntEletro: room.custoUntEletro,
    custoUntHipel: room.custoUntHipel,
    capexItems: [
      { key: 'seguranca', label: 'Segurança', cost: room.capexSegurancaValor, risk: 'Multas por incidentes de segurança' },
      { key: 'balanca', label: 'Balança', cost: room.capexBalancaValor, risk: 'Perda financeira em pesagem' },
      { key: 'redes', label: 'Redes', cost: room.capexRedesValor, risk: 'Parada no PDV (ponto de venda)' },
      { key: 'site', label: 'Site', cost: room.capexSiteValor, risk: 'Perda de vendas online' },
      { key: 'selfCheckout', label: 'Self Checkout', cost: room.capexSelfCheckoutValor, risk: 'Filas longas e perda de clientes' },
      { key: 'melhoriaContinua', label: 'Melhoria Contínua', cost: room.capexMelhoriaContinuaValor, risk: 'Ineficiência operacional' },
    ],
    custoPorOperador: 3000,
  };
}


async function getLatestConfig(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new Error('COMPANY_NOT_FOUND')

  const config = await prisma.companyConfig.findFirst({
    where: { companyId },
    orderBy: { round: 'desc' },
  })

  return config
}

module.exports = { joinRoom, getCompaniesByRoom, leaveRoom, getCompanySettings, getLatestConfig }