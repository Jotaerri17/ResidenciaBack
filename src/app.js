require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')

const roomsRoutes = require('./routes/RoomsRoutes')
const companiesRoutes = require('./routes/CompaniesRoutes')

const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./docs/swagger')

const prisma = require('./lib/prisma')

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: '*' }
})

// disponibiliza o io para os controllers
app.set('io', io)

io.on('connection', (socket) => {
  console.log('cliente conectado:', socket.id)

  socket.on('join_room', (roomCode) => {
    socket.join(roomCode)
    console.log(`socket ${socket.id} entrou na sala ${roomCode}`)
  })

  socket.on('disconnect', () => {
    console.log('cliente desconectado:', socket.id)
  })
})

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use('/rooms', roomsRoutes)
app.use('/companies', companiesRoutes)

app.get('/', (req, res) => {
  res.json({ mensagem: "🚀 API Express funcionando!" })
})

prisma.$connect()
  .then(() => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Conectado ao banco!')
    }
  })
  .catch((err) => console.error('❌ Erro na conexão:', err.message))

// Só sobe o servidor se NÃO estiver em teste
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`)
  })
}

// Exporta para os testes usarem
module.exports = app