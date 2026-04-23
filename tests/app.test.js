describe('API Base', () => {
  it('deve retornar a mensagem de funcionamento na rota /', async () => {
    const response = await global.api.get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('mensagem', '🚀 API Express funcionando!');
  });
});