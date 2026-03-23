const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Residência Unit API',
      version: '1.0.0',
      description: 'API da dinâmica de gestão de loja',
    },
  },
  apis: ['./src/routes/*.js'], // lê as anotações das rotas
}

module.exports = swaggerJsdoc(options)