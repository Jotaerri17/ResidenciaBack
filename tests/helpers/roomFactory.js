const prisma = require('../../src/lib/prisma');
const { generateRoomCode } = require('../../src/utils/generateRoomCode');

/**
 * Retorna um payload mínimo válido para POST /rooms.
 * Aceita overrides para qualquer campo.
 */
function buildRoomPayload(overrides = {}) {
  return {
    custoUntPereciveis: 5.50,
    custoUntMercearia: 3.20,
    custoUntEletro: 150.00,
    custoUntHipel: 8.90,
    estoqueDisponivelPereciveis: 1000,
    estoqueDisponivelMercearia: 1000,
    estoqueDisponivelEletro: 1000,
    estoqueDisponivelHipel: 1000,
    demandaEstqRounds: [25, 25, 25, 25],
    ...overrides,
  };
}

/**
 * Cria sala direto no banco via Prisma (sem passar pelo POST).
 * Útil para testes que precisam de sala existente como pré-condição.
 */
async function createRoomInDb(overrides = {}) {
  return prisma.room.create({
    data: {
      code: generateRoomCode(),
      custoUntPereciveis: 5.50,
      custoUntMercearia: 3.20,
      custoUntEletro: 150.00,
      custoUntHipel: 8.90,
      estoqueDisponivelPereciveis: 1000,
      estoqueDisponivelMercearia: 1000,
      estoqueDisponivelEletro: 1000,
      estoqueDisponivelHipel: 1000,
      demandaEstqRounds: [25, 25, 25, 25],
      ...overrides,
    },
  });
}

/**
 * Cria uma Company vinculada a uma sala.
 */
async function createCompanyInDb(roomId, overrides = {}) {
  return prisma.company.create({
    data: {
      roomId,
      name: 'Empresa Teste',
      managerName: 'Gerente Teste',
      caixa: 700000,
      ...overrides,
    },
  });
}

/**
 * Cria um RoundResult vinculado a uma Company.
 */
async function createRoundResultInDb(companyId, round, overrides = {}) {
  return prisma.roundResult.create({
    data: {
      companyId,
      round,
      receitaTotal: 50000,
      receitaPereciveis: 15000,
      receitaMercearia: 10000,
      receitaEletro: 15000,
      receitaHipel: 10000,
      ...overrides,
    },
  });
}

/**
 * Payload mínimo para POST /companies/join.
 */
function buildJoinPayload(overrides = {}) {
  return {
    name: 'Empresa Teste',
    managerName: 'Gerente Teste',
    ...overrides,
  };
}

/**
 * Payload mínimo para POST /companies/:id/configs.
 * Todos os campos têm defaults conservadores (custo baixo).
 */
function buildConfigPayload(overrides = {}) {
  return {
    estoquePereciveis: 100,
    estoqueMercearia: 200,
    estoqueEletro: 10,
    estoqueHipel: 50,
    margemPereciveis: 20,
    margemMercearia: 15,
    margemEletro: 30,
    margemHipel: 25,
    operadoresVenda: 3,
    operadoresServico: 2,
    capexSeguranca: false,
    capexBalanca: false,
    capexRedes: false,
    capexSite: false,
    capexSelfCheckout: false,
    capexMelhoriaContinua: false,
    ...overrides,
  };
}

module.exports = {
  buildRoomPayload,
  buildJoinPayload,
  buildConfigPayload,
  createRoomInDb,
  createCompanyInDb,
  createRoundResultInDb,
};
