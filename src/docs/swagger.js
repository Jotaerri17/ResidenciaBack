const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Residência Unit API',
      version: '1.0.0',
      description: 'API da dinâmica de gestão de loja',
    },
    components: {
      securitySchemes: {
        facilitatorToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-facilitator-token',
          description: 'Token do facilitador gerado ao criar a sala',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
}

module.exports = swaggerJsdoc(options)