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

async function leaveRoom({ companyId }, io) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { room: true },
  })

  if (!company) {
    throw new Error('COMPANY_NOT_FOUND')
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

  return {
    saldoInicial: company.caixa,
    juros: room.juros,
    custoUntPereciveis: room.custoUntPereciveis,
    custoUntMercearia: room.custoUntMercearia,
    custoUntEletro: room.custoUntEletro,
    custoUntHipel: room.custoUntHipel,
    capexItems: [
      { key: 'seguranca', label: 'Segurança', cost: 50000, risk: 'Multas por incidentes de segurança' },
      { key: 'balanca', label: 'Balança', cost: 30000, risk: 'Perda financeira em pesagem' },
      { key: 'redes', label: 'Redes', cost: 40000, risk: 'Parada no PDV (ponto de venda)' },
      { key: 'site', label: 'Site', cost: 35000, risk: 'Perda de vendas online' },
      { key: 'selfCheckout', label: 'Self Checkout', cost: 80000, risk: 'Filas longas e perda de clientes' },
      { key: 'melhoriaContinua', label: 'Melhoria Contínua', cost: 25000, risk: 'Ineficiência operacional' },
    ],
    custoPorOperador: 3000,
  };
}

async function updateRoundSettings(companyId, settings) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { room: true }
  });

  if (!company) throw new Error('COMPANY_NOT_FOUND');

  const room = company.room;

  // Custos dos itens CAPEX
  const capexCatalog = {
    seguranca: 50000, balanca: 30000, redes: 40000,
    site: 35000, selfCheckout: 80000, melhoriaContinua: 25000,
  };

  // CAPEX selecionado
  const selectedCapex = settings.capexItems || [];
  const totalCapex = selectedCapex.reduce((sum, key) => sum + (capexCatalog[key] || 0), 0);

  // Estoque por categoria
  const custoEstoque =
    (settings.estoquePereciveis || 0) * room.custoUntPereciveis +
    (settings.estoqueMercearia || 0) * room.custoUntMercearia +
    (settings.estoqueEletro || 0) * room.custoUntEletro +
    (settings.estoqueHipel || 0) * room.custoUntHipel;

  // Pessoal (R$ 3.000/operador)
  const custoPessoal =
    ((settings.operadoresCaixa || 0) + (settings.operadoresServico || 0)) * 3000;

  const totalGastos = totalCapex + custoEstoque + custoPessoal;

  // Permite ultrapassar caixa, mas cobra juros
  const excedente = Math.max(0, totalGastos - company.caixa);
  const jurosAplicado = excedente * (room.juros / 100);

  // Preços de venda
  const prices = {
    pereciveis: room.custoUntPereciveis * (1 + (settings.marginPereciveis || 0) / 100),
    mercearia: room.custoUntMercearia * (1 + (settings.marginMercearia || 0) / 100),
    eletro: room.custoUntEletro * (1 + (settings.marginEletro || 0) / 100),
    hipel: room.custoUntHipel * (1 + (settings.marginHipel || 0) / 100),
  };

  // Debitar caixa (inclui juros se ultrapassou)
  const updatedCompany = await prisma.company.update({
    where: { id: companyId },
    data: { caixa: company.caixa - totalGastos - jurosAplicado },
  });

  return {
    ...updatedCompany,
    prices,
    totalGastos,
    excedente,
    jurosAplicado,
    capexSelecionados: selectedCapex,
  };
}
module.exports = { joinRoom, getCompaniesByRoom, leaveRoom, getCompanySettings, updateRoundSettings }