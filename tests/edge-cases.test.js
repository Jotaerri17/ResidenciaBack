/**
 * tests/edge-cases.test.js
 * Edge Cases & Segurança — feat/test-rooms (Tarefa 4)
 *
 * Convenção para bugs documentados:
 *   // BUG: <descrição curta>
 *   // ARQUIVO: <arquivo de produção>
 *   // IMPACTO: <o que acontece em produção>
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  buildRoomPayload,
  buildJoinPayload,
  buildConfigPayload,
  createRoomInDb,
  createCompanyInDb,
} = require('./helpers/roomFactory');

const api = request(app);

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

beforeAll(() => {
  app.set('io', mockIo);
});

beforeEach(async () => {
  jest.clearAllMocks();
  await prisma.roundResult.deleteMany();
  await prisma.companyConfig.deleteMany();
  await prisma.company.deleteMany();
  await prisma.roomEvent.deleteMany();
  await prisma.room.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ============================================================
// Describe 1: Validação de inputs malformados
// ============================================================
describe('Validação de inputs malformados', () => {

  it('POST /rooms com custoUntPereciveis string → deve retornar 400', async () => {
    const res = await api.post('/rooms').send(buildRoomPayload({ custoUntPereciveis: 'abc' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Campos devem ser numéricos/);
  });

  it('POST /rooms com custoUntPereciveis negativo → deve retornar 400', async () => {
    const res = await api.post('/rooms').send(buildRoomPayload({ custoUntPereciveis: -10 }));
    expect(res.status).toBe(400);
  });

  it('POST /companies/join com code numérico → deve retornar 400', async () => {
    const res = await api
      .post('/companies/join')
      .send({ code: 12345, name: 'Empresa X', managerName: 'Gerente X' });
    expect(res.status).toBe(400);
  });

  it('POST /companies/:id/configs com estoquePereciveis negativo → deve rejeitar (400)', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ estoquePereciveis: -100 }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/não-negativos/);
  });

  it('POST /companies/:id/configs com margemPereciveis negativa → deve rejeitar (400)', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ margemPereciveis: -50 }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/válidos/);
  });

  it('POST /companies/:id/configs com margemPereciveis como string → deve rejeitar (400)', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ margemPereciveis: 'muito' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/válidos/);
  });

  it('POST /companies/:id/configs com campo extra (hackerField) → sanitizeConfigData ignora silenciosamente', async () => {
    // Comportamento CORRETO do ponto de vista de segurança (não persiste campo desconhecido),
    // mas a API não avisa o cliente sobre campos ignorados.
    // sanitizeConfigData filtra por ALLOWED_CONFIG_FIELDS.
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ hackerField: true, roomId: 'tentativa-de-injecao' }));

    expect(res.status).toBe(201);
    // Garante que o campo extra NÃO foi persistido
    expect(res.body.config).not.toHaveProperty('hackerField');
    expect(res.body.config).not.toHaveProperty('roomId');
  });
});

// ============================================================
// Describe 2: Segurança e autorização
// ============================================================
describe('Segurança e autorização', () => {

  it('DELETE /companies/:id/leave sem token → deve retornar 401', async () => {
    const room1 = await createRoomInDb();
    await createRoomInDb();
    const companyFromRoom1 = await createCompanyInDb(room1.id, { name: 'Empresa Alvo' });

    const res = await api.delete(`/companies/${companyFromRoom1.id}/leave`);
    expect(res.status).toBe(401);
  });

  it('DELETE /companies/:id/leave com token de outra sala → deve retornar 403', async () => {
    const room1 = await createRoomInDb();
    const room2 = await createRoomInDb();
    const companyFromRoom1 = await createCompanyInDb(room1.id, { name: 'Empresa Alvo' });

    // Usa token de room2 para tentar deletar empresa de room1
    const res = await api
      .delete(`/companies/${companyFromRoom1.id}/leave`)
      .set('x-facilitator-token', room2.facilitatorToken);
    expect(res.status).toBe(403);
  });

  it('GET /companies/:id/settings com ID inexistente → 404', async () => {
    const res = await api.get('/companies/uuid-que-nao-existe/settings');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Empresa não encontrada.');
  });

  it('GET /rooms/:code/rank/:round com round "abc" → deve retornar 400', async () => {
    const room = await createRoomInDb();
    const res = await api.get(`/rooms/${room.code}/rank/abc`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Parâmetro round inválido.');
  });

  it('GET /rooms/:code/resultado/:round com round -1 → 400', async () => {
    const room = await createRoomInDb();
    const res = await api
      .get(`/rooms/${room.code}/resultado/-1`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Parâmetro round inválido.');
  });
});

// ============================================================
// Describe 3: Cálculos críticos
// ============================================================
describe('Cálculos críticos', () => {

  it.skip('calcularDemanda com estoqueDisponivel = 0 → disponibilidade = Infinity (divisão por zero)', async () => {
    // BUG: DemandaService divide config.estoque / room.estoqueDisponivel sem checar zero
    // ARQUIVO: src/service/DemandaService.js (linha ~36-46)
    // IMPACTO: disponibilidade = Infinity → NaN em cálculos subsequentes →
    //          percentualDemanda = NaN → all_companies_confirmed emitido com dados corrompidos.
    //
    // Não é possível testar via HTTP isolado (calcularDemanda é chamado internamente por
    // saveConfig quando todas as empresas confirmam). O teste abaixo simula o cenário:
    // sala com estoqueDisponivelPereciveis = 0, 1 empresa, envia config.

    const room = await createRoomInDb({
      status: 'IN_PROGRESS',
      currentRound: 1,
      estoqueDisponivelPereciveis: 0, // <-- dispara divisão por zero
      estoqueDisponivelMercearia: 0,
      estoqueDisponivelEletro: 0,
      estoqueDisponivelHipel: 0,
      demandaEstqRounds: [100, 25, 25, 25],
    });
    const company = await createCompanyInDb(room.id);

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ estoquePereciveis: 0, estoqueMercearia: 0, estoqueEletro: 0, estoqueHipel: 0 }));

    // Esperado quando corrigido: 201 com disponibilidade = 0 (não Infinity)
    expect(res.status).toBe(201);
    // Verificar que all_companies_confirmed foi emitido com dados válidos (sem NaN/Infinity)
    const allConfirmedCall = mockIo.emit.mock.calls.find(([event]) => event === 'all_companies_confirmed');
    expect(allConfirmedCall).toBeDefined();
    const payload = allConfirmedCall[1];
    payload.demanda.forEach(item => {
      expect(isFinite(item.disponibilidade)).toBe(true);
      expect(isNaN(item.percentualDemanda)).toBe(false);
    });
  });

  it.skip('calcularRankRound com demandaEstqRounds vazio e round 1 → percentualRound = NaN', async () => {
    // BUG: RankRoundService acessa demandaEstqRounds[round-1] sem verificar se o array
    // tem elementos suficientes.
    // ARQUIVO: src/service/RankRoundService.js (linha 21)
    // IMPACTO: percentualRound = undefined / 100 = NaN → totalVenda* = NaN →
    //          qtdVendida* = NaN → r2(NaN) → toFixed falha ou persiste NaN no banco.
    //          Causa falha silenciosa na emissão de all_companies_confirmed.

    const room = await createRoomInDb({
      status: 'IN_PROGRESS',
      currentRound: 1,
      demandaEstqRounds: [], // <-- array vazio, round 1 → índice 0 = undefined
    });
    const company = await createCompanyInDb(room.id);

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    // Quando corrigido: deveria emitir all_companies_confirmed sem NaN nos resultados.
    expect(res.status).toBe(201);
    const allConfirmedCall = mockIo.emit.mock.calls.find(([event]) => event === 'all_companies_confirmed');
    if (allConfirmedCall) {
      const payload = allConfirmedCall[1];
      payload.rank.forEach(item => {
        expect(isNaN(item.receitaTotal)).toBe(false);
      });
    }
  });

  it('saveConfig com totalGastos >> caixa → juros calculado corretamente (valores extremos)', async () => {
    // Reforço do teste de juros com valores extremos para garantir precisão numérica.
    // caixa = 1000, juros = 50%, capexSeguranca = 50000 → excedente = 49000 → juros = 24500
    const room = await createRoomInDb({
      status: 'IN_PROGRESS',
      currentRound: 1,
      caixa: 1000,
      juros: 50,
    });
    const company = await createCompanyInDb(room.id, { caixa: 1000 });

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({
        estoquePereciveis: 0, estoqueMercearia: 0, estoqueEletro: 0, estoqueHipel: 0,
        operadoresVenda: 0, operadoresServico: 0,
        capexSeguranca: true, // valor default da sala = 50000
      }));

    expect(res.status).toBe(201);

    const { totalGastos, jurosAplicado, caixa: caixaFinal } = res.body;

    // totalGastos = 50000 (capexSeguranca)
    expect(totalGastos).toBe(50000);
    // excedente = 50000 - 1000 = 49000; juros = 49000 * 0.50 = 24500
    expect(jurosAplicado).toBe(24500);
    // caixa final = 1000 - 50000 - 24500 = -73500
    expect(caixaFinal).toBe(-73500);
  });
});

// ============================================================
// Describe 4: Estados inválidos do jogo
// ============================================================
describe('Estados inválidos do jogo', () => {

  it('POST /companies/:id/configs em sala FINISHED → 400 GAME_NOT_STARTED', async () => {
    // Sala FINISHED: status !== 'IN_PROGRESS' → service lança GAME_NOT_STARTED
    const room = await createRoomInDb({ status: 'FINISHED', currentRound: 4 });
    const company = await createCompanyInDb(room.id);

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('O jogo ainda não foi iniciado.');
  });

  it('POST /companies/:id/configs em sala CANCELLED → 400 GAME_NOT_STARTED', async () => {
    const room = await createRoomInDb({ status: 'CANCELLED', currentRound: 0 });
    const company = await createCompanyInDb(room.id);

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('O jogo ainda não foi iniciado.');
  });

  it('PATCH /rooms/:code/start em sala já IN_PROGRESS → 400 ROOM_NOT_WAITING', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS' });
    await createCompanyInDb(room.id);

    const res = await api
      .patch(`/rooms/${room.code}/start`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Sala não está aguardando.');
  });

  it('PATCH /rooms/:code/start em sala FINISHED → 400 ROOM_NOT_WAITING', async () => {
    const room = await createRoomInDb({ status: 'FINISHED' });
    await createCompanyInDb(room.id);

    const res = await api
      .patch(`/rooms/${room.code}/start`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Sala não está aguardando.');
  });

  it('PATCH /rooms/:code/cancel em sala FINISHED → comportamento atual (cancelRoom não bloqueia FINISHED)', async () => {
    // cancelRoom só verifica se está CANCELLED. FINISHED pode ser cancelada — verificar
    // se isso é comportamento intencional ou gap de regra de negócio.
    const room = await createRoomInDb({ status: 'FINISHED' });

    const res = await api
      .patch(`/rooms/${room.code}/cancel`)
      .set('x-facilitator-token', room.facilitatorToken);

    // Sem bloqueio explícito para FINISHED → aceita e muda para CANCELLED
    expect(res.status).toBe(200);
    expect(res.body.room.status).toBe('CANCELLED');
  });

  it('POST /companies/join em sala FINISHED → 400 ROOM_NOT_AVAILABLE', async () => {
    const room = await createRoomInDb({ status: 'FINISHED' });

    const res = await api
      .post('/companies/join')
      .send(buildJoinPayload({ code: room.code }));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Sala não está disponível para entrar.');
  });

  it('POST /companies/join em sala CANCELLED → 400 ROOM_NOT_AVAILABLE', async () => {
    const room = await createRoomInDb({ status: 'CANCELLED' });

    const res = await api
      .post('/companies/join')
      .send(buildJoinPayload({ code: room.code }));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Sala não está disponível para entrar.');
  });
});
