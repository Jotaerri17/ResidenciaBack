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

  it.skip('POST /rooms com custoUntPereciveis string → deveria retornar 400', async () => {
    // BUG: Sem validação de tipo no controller/service
    // ARQUIVO: src/controller/RoomsController.js (handleCreateRoom)
    // IMPACTO: Prisma recebe Float inválido e lança PrismaClientValidationError →
    //          controller captura e devolve 500. Cliente recebe mensagem genérica de erro,
    //          sem indicação de qual campo está errado.
    const res = await api.post('/rooms').send(buildRoomPayload({ custoUntPereciveis: 'abc' }));
    expect(res.status).toBe(400);
  });

  it('POST /rooms com custoUntPereciveis string → comportamento atual é 500', async () => {
    // Documenta o comportamento REAL enquanto o bug não é corrigido.
    const res = await api.post('/rooms').send(buildRoomPayload({ custoUntPereciveis: 'abc' }));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao criar sala.');
  });

  it.skip('POST /rooms com custoUntPereciveis negativo → deveria retornar 400', async () => {
    // BUG: Sem validação de valores negativos no controller/service
    // ARQUIVO: src/controller/RoomsController.js (handleCreateRoom)
    // IMPACTO: Sala é criada com custo unitário negativo, o que distorce todos os
    //          cálculos de receita, preço médio e demanda nas rodadas.
    const res = await api.post('/rooms').send(buildRoomPayload({ custoUntPereciveis: -10 }));
    expect(res.status).toBe(400);
  });

  it('POST /rooms com custoUntPereciveis negativo → comportamento atual é 201', async () => {
    // Documenta o comportamento REAL — aceita silenciosamente.
    const res = await api.post('/rooms').send(buildRoomPayload({ custoUntPereciveis: -10 }));
    expect(res.status).toBe(201);
    expect(res.body.room.custoUntPereciveis).toBe(-10);
  });

  it.skip('POST /companies/join com code numérico → deveria retornar 400 (ou 404 com coerção)', async () => {
    // BUG: Controller não valida se code é string antes de passar ao service.
    // ARQUIVO: src/controller/CompaniesController.js (handleJoinRoom)
    // IMPACTO: Prisma 7 faz validação de tipo em runtime no cliente. Quando code é
    //          um número (Int), lança PrismaClientValidationError internamente,
    //          o controller captura no catch genérico e retorna 500 em vez de 400.
    //          Cliente não sabe que o campo tem tipo errado.
    const res = await api
      .post('/companies/join')
      .send({ code: 12345, name: 'Empresa X', managerName: 'Gerente X' });
    expect(res.status).toBe(400);
  });

  it('POST /companies/join com code numérico → comportamento atual é 500 (Prisma rejeita tipo Int no campo String)', async () => {
    // Prisma 7 valida tipos no cliente antes de enviar a query ao banco.
    // code (Int) em campo String única → PrismaClientValidationError → catch genérico → 500.
    const res = await api
      .post('/companies/join')
      .send({ code: 12345, name: 'Empresa X', managerName: 'Gerente X' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao entrar na sala.');
  });

  it.skip('POST /companies/:id/configs com estoquePereciveis negativo → deveria rejeitar', async () => {
    // BUG: saveConfig não valida se os valores de estoque são não-negativos
    // ARQUIVO: src/service/CompanyConfigService.js (saveConfig)
    // IMPACTO: Empresa compra estoque negativo → custo negativo → o caixa aumenta em vez
    //          de diminuir. Distorce completamente a simulação financeira.
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ estoquePereciveis: -100 }));
    expect(res.status).toBe(400);
  });

  it('POST /companies/:id/configs com estoquePereciveis negativo → comportamento atual é 201', async () => {
    // Documenta que a API aceita valores negativos sem reclamar.
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ estoquePereciveis: -100 }));
    expect(res.status).toBe(201);
    expect(res.body.config.estoquePereciveis).toBe(-100);
  });

  it.skip('POST /companies/:id/configs com margemPereciveis negativa → deveria rejeitar', async () => {
    // BUG: Sem validação de margem negativa em saveConfig
    // ARQUIVO: src/service/CompanyConfigService.js (saveConfig)
    // IMPACTO: Margem negativa gera preço de venda abaixo do custo unitário,
    //          tornando disponibilidade e demanda incorretas.
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ margemPereciveis: -50 }));
    expect(res.status).toBe(400);
  });

  it('POST /companies/:id/configs com margemPereciveis negativa → comportamento atual é 201', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({ margemPereciveis: -50 }));
    expect(res.status).toBe(201);
    expect(res.body.config.margemPereciveis).toBe(-50);
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

  it.skip('DELETE /companies/:id/leave sem verificar pertencimento à sala → deveria retornar 403', async () => {
    // BUG: leaveRoom não verifica se a empresa pertence a sala do requisitante.
    // ARQUIVO: src/service/CompaniesService.js (leaveRoom) /
    //          src/controller/CompaniesController.js (handleLeaveRoom)
    // IMPACTO: Qualquer usuário que conheça o ID de uma empresa pode removê-la
    //          de qualquer sala, mesmo sem ser o facilitador ou a própria empresa.
    //          Vetor de ataque: enumeração de UUIDs via força bruta ou leak de ID.
    const room1 = await createRoomInDb();
    const room2 = await createRoomInDb();
    const companyFromRoom1 = await createCompanyInDb(room1.id, { name: 'Empresa Alvo' });

    // Simulamos requisição "a partir da sala 2" tentando deletar empresa da sala 1.
    // Sem autenticação, a rota não tem como distinguir isso — qualquer ID funciona.
    const res = await api.delete(`/companies/${companyFromRoom1.id}/leave`);
    expect(res.status).toBe(403);
  });

  it('DELETE /companies/:id/leave com empresa de outra sala → comportamento atual é 200 (bug de autorização)', async () => {
    // Documenta a ausência de verificação de pertencimento.
    const room1 = await createRoomInDb();
    await createRoomInDb(); // room2 — só para ter contexto de "outra sala"
    const companyFromRoom1 = await createCompanyInDb(room1.id, { name: 'Empresa Alvo' });

    const res = await api.delete(`/companies/${companyFromRoom1.id}/leave`);
    expect(res.status).toBe(200); // Deleta sem restrição

    // Confirma que realmente foi deletada (o bug é que não deveria ter sido)
    const deleted = await prisma.company.findUnique({ where: { id: companyFromRoom1.id } });
    expect(deleted).toBeNull();
  });

  it('GET /companies/:id/settings com ID inexistente → 404', async () => {
    const res = await api.get('/companies/uuid-que-nao-existe/settings');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Empresa não encontrada.');
  });

  it.skip('GET /rooms/:code/rank/:round com round "abc" → deveria retornar 400', async () => {
    // BUG: handleGetRank não valida se round é um inteiro válido
    // ARQUIVO: src/controller/RoomsController.js (handleGetRank)
    // IMPACTO: parseInt("abc") retorna NaN. Prisma 7 trata NaN como valor ausente
    //          e lança PrismaClientValidationError ("Argument round is missing"),
    //          o catch genérico devolve 500. Cliente não sabe que o parâmetro
    //          está errado.
    const room = await createRoomInDb();
    const res = await api.get(`/rooms/${room.code}/rank/abc`);
    expect(res.status).toBe(400);
  });

  it('GET /rooms/:code/rank/:round com round "abc" → comportamento atual é 500 (NaN rejeitado pelo Prisma 7)', async () => {
    // parseInt("abc") = NaN. Prisma 7 não aceita NaN como Int: lança
    // PrismaClientValidationError ("Argument round is missing") → catch genérico → 500.
    const room = await createRoomInDb();
    const res = await api.get(`/rooms/${room.code}/rank/abc`);
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao buscar ranking.');
  });

  it('GET /rooms/:code/resultado/:round com round -1 → 200 (retorna array vazio)', async () => {
    // Não há validação de round mínimo. round: -1 é enviado ao Prisma como inteiro válido,
    // a query simplesmente não encontra resultados com round = -1.
    const room = await createRoomInDb();
    const res = await api
      .get(`/rooms/${room.code}/resultado/-1`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
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
    expect(res.body.message).toBe('O jogo ainda nao foi iniciado.');
  });

  it('POST /companies/:id/configs em sala CANCELLED → 400 GAME_NOT_STARTED', async () => {
    const room = await createRoomInDb({ status: 'CANCELLED', currentRound: 0 });
    const company = await createCompanyInDb(room.id);

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('O jogo ainda nao foi iniciado.');
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
