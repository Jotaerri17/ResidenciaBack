// globalSetup.js — Roda ANTES de qualquer módulo ser importado pelo Jest
// Garante que .env.test é carregado com prioridade máxima
const path = require('path');

module.exports = async function () {
  require('dotenv').config({
    path: path.resolve(__dirname, '..', '.env.test'),
    override: true,
  });
};
