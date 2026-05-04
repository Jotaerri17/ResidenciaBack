module.exports = {
  testEnvironment: 'node',
  // dotenv carregado pelo Jest ANTES de qualquer módulo ser importado
  // Disponível no Jest >= 29 com a opção nativa
  setupFiles: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};
