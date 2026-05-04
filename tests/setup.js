// setup.js — Carrega .env.test com override ANTES de qualquer módulo do projeto
// setupFiles roda antes de cada arquivo de teste, antes dos imports
const path = require('path');

// dotenv@17 retorna as vars carregadas — garantimos que DATABASE_URL vem do .env.test
const result = require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env.test'),
  override: true,
});

if (result.error) {
  throw new Error(`Falha ao carregar .env.test: ${result.error.message}`);
}

// Garante NODE_ENV=test para o pool do Prisma (desliga SSL)
process.env.NODE_ENV = 'test';
