if (!process.env.DATABASE_URL) require('dotenv').config();

const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')

const roomsRoutes = require('./routes/RoomsRoutes')
const companiesRoutes = require('./routes/CompaniesRoutes')
const quizRoutes = require('./routes/QuizRoutes')
const chatRoutes = require('./routes/ChatRoutes')
const categoryRoutes = require('./routes/CategoryRoutes')
const timerService = require('./service/TimerService')

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

  socket.on('join_room', async (roomCode) => {
    if (typeof roomCode !== 'string' || !/^[A-Z0-9]{6}$/.test(roomCode)) return
    socket.join(roomCode)
    console.log(`socket ${socket.id} entrou na sala ${roomCode}`)
    
    // Envia o timer atual para quem acabou de entrar (regra 3)
    try {
      const timer = await timerService.getOrInitTimer(roomCode)
      socket.emit('server:timer-update', {
        timeLeft: timer.timeLeft,
        isActive: timer.isActive,
        currentRound: timer.currentRound,
        totalRounds: timer.totalRounds
      })
    } catch (err) {
      console.error('[Socket] Erro ao enviar timer no join_room:', err.message)
    }
  })

  socket.on('facilitator:start-timer', async (data) => {
    console.log('Back recebeu start-timer:', data)
    const { roomCode, duration, facilitatorToken } = data || {}
    try {
      const timer = await timerService.getOrInitTimer(roomCode)
      const isNewOrReset = timer.timeLeft <= 0 || 
                           timer.timeLeft === timer.duration || 
                           (duration !== undefined && duration !== timer.duration);

      if (isNewOrReset && duration !== undefined) {
        await timerService.initTimer(roomCode, duration)
      }
      await timerService.startTimer(roomCode, io, facilitatorToken)
    } catch (err) {
      console.error('[Socket] Erro em start-timer:', err.message)
      socket.emit('server:error', { message: err.message })
    }
  })

  socket.on('facilitator:pause-timer', async (data) => {
    console.log('Back recebeu pause-timer:', data)
    const { roomCode, facilitatorToken } = data || {}
    try {
      await timerService.pauseTimer(roomCode, io, facilitatorToken)
    } catch (err) {
      console.error('[Socket] Erro em pause-timer:', err.message)
      socket.emit('server:error', { message: err.message })
    }
  })

  socket.on('facilitator:add-time', async (data) => {
    console.log('Back recebeu add-time:', data)
    const { roomCode, facilitatorToken, amount } = data || {}
    try {
      await timerService.addTime(roomCode, io, facilitatorToken, amount)
    } catch (err) {
      console.error('[Socket] Erro em add-time:', err.message)
      socket.emit('server:error', { message: err.message })
    }
  })

  socket.on('facilitator:subtract-time', async (data) => {
    console.log('Back recebeu subtract-time:', data)
    const { roomCode, facilitatorToken, amount } = data || {}
    try {
      await timerService.subtractTime(roomCode, io, facilitatorToken, amount)
    } catch (err) {
      console.error('[Socket] Erro em subtract-time:', err.message)
      socket.emit('server:error', { message: err.message })
    }
  })

  socket.on('facilitator:next-round', async (data) => {
    console.log('Back recebeu next-round:', data)
    const { roomCode, facilitatorToken } = data || {}
    try {
      // Capturar duração ANTES do nextRound limpar o timer,
      // para restaurar a mesma duração na próxima rodada
      const durationAnterior = timerService.timers[roomCode]?.duration ?? 1200

      const { nextRound } = require('./service/RoomsService')
      await nextRound({ code: roomCode, facilitatorToken }, io)

      // Reinicializar com a duração original (não o default de 1200s)
      await timerService.initTimer(roomCode, durationAnterior)
      await timerService.emitTimerUpdate(roomCode, io)
    } catch (err) {
      console.error('[Socket] Erro em next-round:', err.message)
      socket.emit('server:error', { message: err.message })
    }
  })


  socket.on('facilitator:end-game', async (data) => {
    console.log('Back recebeu end-game:', data)
    const { roomCode, facilitatorToken } = data || {}
    try {
      const { finishGame } = require('./service/RoomsService')
      await finishGame({ code: roomCode, facilitatorToken }, io)
      await timerService.clearTimerState(roomCode)
    } catch (err) {
      console.error('[Socket] Erro em end-game:', err.message)
      socket.emit('server:error', { message: err.message })
    }
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
app.use('/quiz', quizRoutes)
app.use('/chat', chatRoutes)
app.use('/categories', categoryRoutes)

app.get('/', (req, res) => {
  res.json({ mensagem: "🚀 API Express funcionando!" })
})

if (process.env.NODE_ENV !== 'test') {
  prisma.$connect()
    .then(() => console.log('✅ Conectado ao banco!'))
    .catch((err) => console.error('❌ Erro na conexão:', err.message))

  const PORT = process.env.PORT || 3000
  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`)
  })
}

module.exports = app