const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  buildRoomPayload,
  createRoomInDb,
  createCompanyInDb,
  createRoundResultInDb,
} = require('./helpers/roomFactory');

const api = request(app);

// Mock Socket.IO — injeta no app antes dos testes
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

beforeAll(() => {
  app.set('io', mockIo);
});

beforeEach(async () => {
  jest.clearAllMocks();
  // Limpa banco na ordem correta (FK constraints)
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
// POST /rooms
// ============================================================
describe('POST /rooms', () => {
  it('deve criar sala com sucesso (201)', async () => {
    const res = await api.post('/rooms').send(buildRoomPayload());

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Sala criada com sucesso!');
    expect(res.body.room).toBeDefined();
    expect(res.body.facilitadorToken).toBeDefined();
  });

  it('deve gerar code com 6 caracteres alfanuméricos', async () => {
    const res = await api.post('/rooms').send(buildRoomPayload());

    expect(res.body.room.code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('deve retornar room com status WAITING e currentRound 0', async () => {
    const res = await api.post('/rooms').send(buildRoomPayload());

    expect(res.body.room.status).toBe('WAITING');
    expect(res.body.room.currentRound).toBe(0);
  });

  it('deve aplicar defaults quando campos opcionais não são enviados', async () => {
    const res = await api.post('/rooms').send(buildRoomPayload());
    const room = res.body.room;

    expect(room.caixa).toBe(700000);
    expect(room.juros).toBe(12);
    expect(room.totalRounds).toBe(4);
  });

  it('deve aceitar overrides nos campos com default', async () => {
    const res = await api
      .post('/rooms')
      .send(buildRoomPayload({ caixa: 500000, totalRounds: 6 }));

    expect(res.body.room.caixa).toBe(500000);
    expect(res.body.room.totalRounds).toBe(6);
  });

  it('deve criar sala com events', async () => {
    const payload = buildRoomPayload({
      events: [
        { round: 1, type: 'EQUIPMENT_FAILURE', description: 'Falha no freezer' },
        { round: 2, type: 'SYSTEM_FAILURE', description: 'Queda de sistema' },
      ],
    });
    const res = await api.post('/rooms').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.room.events).toHaveLength(2);
    expect(res.body.room.events[0].type).toBe('EQUIPMENT_FAILURE');
  });

  it('deve retornar 500 quando campos obrigatórios estão faltando', async () => {
    const res = await api.post('/rooms').send({});

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erro ao criar sala.');
  });

  // Documentação de bug: controller não valida tipos dos campos
  it.skip('[BUG] deveria retornar 400 se custoUntPereciveis for string', async () => {
    const res = await api
      .post('/rooms')
      .send(buildRoomPayload({ custoUntPereciveis: 'abc' }));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /rooms/:code
// ============================================================
describe('GET /rooms/:code', () => {
  it('deve retornar sala existente (200)', async () => {
    const room = await createRoomInDb();
    const res = await api.get(`/rooms/${room.code}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(room.code);
    expect(res.body.id).toBe(room.id);
  });

  it('deve incluir events e companies na resposta', async () => {
    const room = await createRoomInDb();
    const res = await api.get(`/rooms/${room.code}`);

    expect(res.body).toHaveProperty('events');
    expect(res.body).toHaveProperty('companies');
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(Array.isArray(res.body.companies)).toBe(true);
  });

  it('deve retornar 404 para sala inexistente', async () => {
    const res = await api.get('/rooms/ZZZZZZ');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Sala não encontrada.');
  });
});

// ============================================================
// PATCH /rooms/:code/cancel
// ============================================================
describe('PATCH /rooms/:code/cancel', () => {
  it('deve cancelar sala com sucesso (200)', async () => {
    const room = await createRoomInDb();
    const res = await api
      .patch(`/rooms/${room.code}/cancel`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Sala cancelada com sucesso!');
    expect(res.body.room.status).toBe('CANCELLED');
  });

  it('deve emitir room_cancelled via Socket.IO', async () => {
    const room = await createRoomInDb();
    await api
      .patch(`/rooms/${room.code}/cancel`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(mockIo.to).toHaveBeenCalledWith(room.code);
    expect(mockIo.emit).toHaveBeenCalledWith('room_cancelled');
  });

  it('deve retornar 401 sem token', async () => {
    const room = await createRoomInDb();
    const res = await api.patch(`/rooms/${room.code}/cancel`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token do facilitador obrigatório.');
  });

  it('deve retornar 403 com token errado', async () => {
    const room = await createRoomInDb();
    const res = await api
      .patch(`/rooms/${room.code}/cancel`)
      .set('x-facilitator-token', 'token-invalido');

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Acesso negado.');
  });

  it('deve retornar 404 para sala inexistente', async () => {
    const res = await api
      .patch('/rooms/ZZZZZZ/cancel')
      .set('x-facilitator-token', 'qualquer-token');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Sala não encontrada.');
  });

  it('deve retornar 400 se sala já foi cancelada', async () => {
    const room = await createRoomInDb({ status: 'CANCELLED' });
    const res = await api
      .patch(`/rooms/${room.code}/cancel`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Sala já foi cancelada.');
  });
});

// ============================================================
// PATCH /rooms/:code/start
// ============================================================
describe('PATCH /rooms/:code/start', () => {
  it('deve iniciar jogo com sucesso (200)', async () => {
    const room = await createRoomInDb();
    await createCompanyInDb(room.id);

    const res = await api
      .patch(`/rooms/${room.code}/start`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Jogo iniciado com sucesso!');
    expect(res.body.room.status).toBe('IN_PROGRESS');
    expect(res.body.room.currentRound).toBe(1);
  });

  it('deve emitir game_started via Socket.IO', async () => {
    const room = await createRoomInDb();
    await createCompanyInDb(room.id);

    await api
      .patch(`/rooms/${room.code}/start`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(mockIo.to).toHaveBeenCalledWith(room.code);
    expect(mockIo.emit).toHaveBeenCalledWith('game_started');
  });

  it('deve retornar 401 sem token', async () => {
    const room = await createRoomInDb();
    const res = await api.patch(`/rooms/${room.code}/start`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token do facilitador obrigatório.');
  });

  it('deve retornar 403 com token errado', async () => {
    const room = await createRoomInDb();
    const res = await api
      .patch(`/rooms/${room.code}/start`)
      .set('x-facilitator-token', 'token-invalido');

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Acesso negado.');
  });

  it('deve retornar 404 para sala inexistente', async () => {
    const res = await api
      .patch('/rooms/ZZZZZZ/start')
      .set('x-facilitator-token', 'qualquer-token');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Sala não encontrada.');
  });

  it('deve retornar 400 se sala não está WAITING', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS' });
    await createCompanyInDb(room.id);

    const res = await api
      .patch(`/rooms/${room.code}/start`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Sala não está aguardando.');
  });

  it('deve retornar 400 se não há empresas na sala', async () => {
    const room = await createRoomInDb();
    // Sem criar company

    const res = await api
      .patch(`/rooms/${room.code}/start`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Nenhuma empresa na sala.');
  });
});

// ============================================================
// GET /rooms/:code/rank/:round
// ============================================================
describe('GET /rooms/:code/rank/:round', () => {
  it('deve retornar ranking vazio quando não há resultados (200)', async () => {
    const room = await createRoomInDb();
    const res = await api.get(`/rooms/${room.code}/rank/1`);

    expect(res.status).toBe(200);
    expect(res.body.rank).toEqual([]);
    expect(res.body.meuResultado).toBeNull();
  });

  it('deve retornar ranking ordenado por receitaTotal desc', async () => {
    const room = await createRoomInDb();
    const company1 = await createCompanyInDb(room.id, { name: 'Empresa A', managerName: 'Gerente A' });
    const company2 = await createCompanyInDb(room.id, { name: 'Empresa B', managerName: 'Gerente B' });

    await createRoundResultInDb(company1.id, 1, { receitaTotal: 30000 });
    await createRoundResultInDb(company2.id, 1, { receitaTotal: 50000 });

    const res = await api.get(`/rooms/${room.code}/rank/1`);

    expect(res.status).toBe(200);
    expect(res.body.rank).toHaveLength(2);
    // Primeiro no ranking deve ter maior receita
    expect(res.body.rank[0].company.name).toBe('Empresa B');
    expect(res.body.rank[1].company.name).toBe('Empresa A');
  });

  it('deve retornar meuResultado quando companyId é informado', async () => {
    const room = await createRoomInDb();
    const company = await createCompanyInDb(room.id);
    await createRoundResultInDb(company.id, 1);

    const res = await api.get(`/rooms/${room.code}/rank/1?companyId=${company.id}`);

    expect(res.status).toBe(200);
    expect(res.body.meuResultado).toBeDefined();
    expect(res.body.meuResultado).toHaveProperty('receitaTotal');
    expect(res.body.meuResultado).toHaveProperty('receitaBruta');
    expect(res.body.meuResultado).toHaveProperty('valorPenalidade');
    expect(res.body.meuResultado).toHaveProperty('percentualPenalidade');
  });
});

// ============================================================
// GET /rooms/:code/resultado/:round
// ============================================================
describe('GET /rooms/:code/resultado/:round', () => {
  it('deve retornar resultado completo (200)', async () => {
    const room = await createRoomInDb();
    const company = await createCompanyInDb(room.id);
    await createRoundResultInDb(company.id, 1);

    const res = await api
      .get(`/rooms/${room.code}/resultado/1`)
      .set('x-facilitator-token', room.facilitatorToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('company');
    expect(res.body[0].company).toHaveProperty('name');
  });

  it('deve retornar 401 sem token', async () => {
    const room = await createRoomInDb();
    const res = await api.get(`/rooms/${room.code}/resultado/1`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token do facilitador obrigatório.');
  });

  it('deve retornar 403 com token errado', async () => {
    const room = await createRoomInDb();
    const res = await api
      .get(`/rooms/${room.code}/resultado/1`)
      .set('x-facilitator-token', 'token-invalido');

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Acesso negado.');
  });

  it('deve retornar 404 para sala inexistente', async () => {
    const res = await api
      .get('/rooms/ZZZZZZ/resultado/1')
      .set('x-facilitator-token', 'qualquer-token');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Sala não encontrada.');
  });
});
