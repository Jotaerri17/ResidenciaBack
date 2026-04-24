// Carrega .env.test ANTES de qualquer import do app/prisma
// override: true garante que sobrescreve qualquer variável já existente
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env.test'),
  override: true,
});
