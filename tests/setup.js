// Caixa de ferramentas que todos os testes vão usar
// Por enquanto está reservado. Aqui é onde a gente vai colocar funções 
// para criar sala, criar empresa, limpar banco, etc.
// Evita copiar e colar código em 50 arquivos diferentes.

const request = require('supertest');
const app = require('../src/app');

// Helper DRY: qualquer teste pode chamar api.get('/'), api.post('/rooms'), etc.
global.api = request(app);