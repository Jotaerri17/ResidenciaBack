const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  buildJoinPayload,
  buildConfigPayload,
  createRoomInDb,
  createCompanyInDb,
} = require('./helpers/roomFactory');

const api = request(app);

// ── Socket.IO mock ───────────────────────────────────────────
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

beforeAll(() => {
  app.set('io', mockIo);
});

beforeEach(async () => {
  jest.clearAllMocks();
  // Limpa na ordem correta (FK constraints)
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
// POST /companies/join
// ============================================================
describe('POST /companies/join', () => {
  it('deve criar empresa com sucesso (201)', async () => {
    const room = await createRoomInDb();

    const res = await api
      .post('/companies/join')
      .send(buildJoinPayload({ code: room.code }));

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Empresa cadastrada com sucesso!');
    expect(res.body.company).toBeDefined();
    expect(res.body.company.id).toBeDefined();
    expect(res.body.company.name).toBe('Empresa Teste');
    expect(res.body.company.managerName).toBe('Gerente Teste');
    expect(res.body.company.roomId).toBe(room.id);
  });

  it('caixa da empresa deve ser igual ao caixa da sala', async () => {
    const room = await createRoomInDb({ caixa: 500000 });

    const res = await api
      .post('/companies/join')
      .send(buildJoinPayload({ code: room.code }));

    expect(res.status).toBe(201);
    expect(res.body.company.caixa).toBe(500000);
  });

  it('deve emitir companies_updated via Socket.IO após join', async () => {
    const room = await createRoomInDb();

    await api
      .post('/companies/join')
      .send(buildJoinPayload({ code: room.code }));

    expect(mockIo.to).toHaveBeenCalledWith(room.code);
    expect(mockIo.emit).toHaveBeenCalledWith('companies_updated', expect.any(Array));
  });

  it('deve retornar 400 se sala não está WAITING', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS' });

    const res = await api
      .post('/companies/join')
      .send(buildJoinPayload({ code: room.code }));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Sala não está disponível para entrar.');
  });

  it('deve retornar 404 se sala não existe', async () => {
    const res = await api
      .post('/companies/join')
      .send(buildJoinPayload({ code: 'ZZZZZZ' }));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Sala não encontrada.');
  });

  it('deve retornar 400 se code está faltando no body', async () => {
    const res = await api
      .post('/companies/join')
      .send({ name: 'Empresa X', managerName: 'Gerente X' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('code, name e managerName são obrigatórios.');
  });

  it('deve retornar 400 se name está faltando no body', async () => {
    const room = await createRoomInDb();

    const res = await api
      .post('/companies/join')
      .send({ code: room.code, managerName: 'Gerente X' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('code, name e managerName são obrigatórios.');
  });

  it('deve retornar 400 se managerName está faltando no body', async () => {
    const room = await createRoomInDb();

    const res = await api
      .post('/companies/join')
      .send({ code: room.code, name: 'Empresa X' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('code, name e managerName são obrigatórios.');
  });
});

// ============================================================
// GET /companies/:code
// ============================================================
describe('GET /companies/:code', () => {
  it('deve retornar array de empresas da sala (200)', async () => {
    const room = await createRoomInDb();
    await createCompanyInDb(room.id, { name: 'Empresa A', managerName: 'Gerente A' });
    await createCompanyInDb(room.id, { name: 'Empresa B', managerName: 'Gerente B' });

    const res = await api.get(`/companies/${room.code}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    const names = res.body.map(c => c.name);
    expect(names).toContain('Empresa A');
    expect(names).toContain('Empresa B');
  });

  it('deve retornar array vazio se sala não tem empresas (200)', async () => {
    const room = await createRoomInDb();

    const res = await api.get(`/companies/${room.code}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('deve retornar 404 se sala não existe', async () => {
    const res = await api.get('/companies/ZZZZZZ');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Sala não encontrada.');
  });
});

// ============================================================
// DELETE /companies/:id/leave
// ============================================================
describe('DELETE /companies/:id/leave', () => {
  it('deve remover empresa com sucesso (200)', async () => {
    const room = await createRoomInDb();
    const company = await createCompanyInDb(room.id);

    const res = await api.delete(`/companies/${company.id}/leave`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Empresa removida da sala com sucesso!');

    // Confirmar que foi deletada do banco
    const deleted = await prisma.company.findUnique({ where: { id: company.id } });
    expect(deleted).toBeNull();
  });

  it('deve retornar 404 se empresa não existe', async () => {
    const res = await api.delete('/companies/id-inexistente/leave');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Empresa não encontrada.');
  });

  it('deve emitir companies_updated via Socket.IO após leave', async () => {
    const room = await createRoomInDb();
    const company = await createCompanyInDb(room.id);

    await api.delete(`/companies/${company.id}/leave`);

    expect(mockIo.to).toHaveBeenCalledWith(room.code);
    expect(mockIo.emit).toHaveBeenCalledWith('companies_updated', expect.any(Array));
  });
});

// ============================================================
// GET /companies/:id/settings
// ============================================================
describe('GET /companies/:id/settings', () => {
  it('deve retornar settings corretos (200)', async () => {
    const room = await createRoomInDb({ caixa: 500000, juros: 10 });
    const company = await createCompanyInDb(room.id, { caixa: 500000 });

    const res = await api.get(`/companies/${company.id}/settings`);

    expect(res.status).toBe(200);
    expect(res.body.saldoInicial).toBe(500000);
    expect(res.body.juros).toBe(10);
    expect(res.body.custoUntPereciveis).toBe(5.5);
    expect(res.body.custoUntMercearia).toBe(3.2);
    expect(res.body.custoUntEletro).toBe(150);
    expect(res.body.custoUntHipel).toBe(8.9);
    expect(res.body.custoPorOperador).toBe(3000);
  });

  it('capexItems deve ter 6 itens com key, label, cost, risk', async () => {
    const room = await createRoomInDb();
    const company = await createCompanyInDb(room.id);

    const res = await api.get(`/companies/${company.id}/settings`);

    expect(res.status).toBe(200);
    expect(res.body.capexItems).toHaveLength(6);

    const expectedKeys = ['seguranca', 'balanca', 'redes', 'site', 'selfCheckout', 'melhoriaContinua'];
    res.body.capexItems.forEach((item, i) => {
      expect(item).toHaveProperty('key', expectedKeys[i]);
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('cost');
      expect(item).toHaveProperty('risk');
    });
  });

  it('deve retornar 404 se empresa não existe', async () => {
    const res = await api.get('/companies/id-inexistente/settings');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Empresa não encontrada.');
  });
});

// ============================================================
// POST /companies/:id/configs
// ============================================================
describe('POST /companies/:id/configs', () => {
  it('deve salvar config com sucesso (201)', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Configuracao enviada com sucesso!');
    expect(res.body.round).toBe(1);
    expect(res.body.config).toBeDefined();
  });

  it('deve retornar caixa atualizado, totalGastos e jurosAplicado (201)', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    expect(res.body).toHaveProperty('caixa');
    expect(res.body).toHaveProperty('totalGastos');
    expect(res.body).toHaveProperty('jurosAplicado');
    expect(typeof res.body.caixa).toBe('number');
    expect(typeof res.body.totalGastos).toBe('number');
    expect(typeof res.body.jurosAplicado).toBe('number');
  });

  it('deve debitar caixa sem juros quando totalGastos <= caixa', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id, { caixa: 700000 });

    // Payload barato: 0 estoque, 0 operadores, 0 capex → totalGastos = 0
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({
        estoquePereciveis: 0, estoqueMercearia: 0, estoqueEletro: 0, estoqueHipel: 0,
        operadoresVenda: 0, operadoresServico: 0,
      }));

    expect(res.status).toBe(201);
    expect(res.body.jurosAplicado).toBe(0);
    expect(res.body.totalGastos).toBe(0);
    expect(res.body.caixa).toBe(700000);
  });

  it('deve aplicar juros quando totalGastos > caixa', async () => {
    // caixa pequeno, payload com CAPEX caro para garantir excedente
    const room = await createRoomInDb({
      status: 'IN_PROGRESS',
      currentRound: 1,
      caixa: 1000,
      juros: 10,
    });
    const company = await createCompanyInDb(room.id, { caixa: 1000 });

    // capexSeguranca = 50000 (default) >> caixa de 1000
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload({
        estoquePereciveis: 0, estoqueMercearia: 0, estoqueEletro: 0, estoqueHipel: 0,
        operadoresVenda: 0, operadoresServico: 0,
        capexSeguranca: true,
      }));

    expect(res.status).toBe(201);
    expect(res.body.jurosAplicado).toBeGreaterThan(0);
    // caixa final = 1000 - capexSeguranca - juros (deve ser negativo)
    expect(res.body.caixa).toBeLessThan(0);
  });

  it('deve retornar 404 se empresa não existe', async () => {
    const res = await api
      .post('/companies/id-inexistente/configs')
      .send(buildConfigPayload());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Empresa nao encontrada.');
  });

  it('deve retornar 400 se jogo não foi iniciado (sala WAITING)', async () => {
    const room = await createRoomInDb({ status: 'WAITING', currentRound: 0 });
    const company = await createCompanyInDb(room.id);

    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('O jogo ainda nao foi iniciado.');
  });

  it('deve retornar 400 se config já foi enviada para esta rodada', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);

    // Primeira config — deve passar
    await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    // Segunda config no mesmo round — deve ser rejeitada
    const res = await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Configuracao ja enviada para este round.');
  });

  it('deve emitir company_config_saved com confirmadas, total e caixa', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);

    await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    expect(mockIo.to).toHaveBeenCalledWith(room.code);
    expect(mockIo.emit).toHaveBeenCalledWith(
      'company_config_saved',
      expect.objectContaining({
        companyId: company.id,
        round: 1,
        confirmadas: expect.any(Number),
        total: expect.any(Number),
        caixa: expect.any(Number),
      })
    );
  });

  it('quando última empresa confirma, deve emitir all_companies_confirmed', async () => {
    const room = await createRoomInDb({ status: 'IN_PROGRESS', currentRound: 1 });
    const company = await createCompanyInDb(room.id);

    // Única empresa na sala envia config → deve ser a "última"
    await api
      .post(`/companies/${company.id}/configs`)
      .send(buildConfigPayload());

    const emitCalls = mockIo.emit.mock.calls;
    const allConfirmedCall = emitCalls.find(([event]) => event === 'all_companies_confirmed');
    expect(allConfirmedCall).toBeDefined();
    expect(allConfirmedCall[1]).toMatchObject({ round: 1 });
  });
});
