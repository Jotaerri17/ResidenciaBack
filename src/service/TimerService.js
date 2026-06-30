const prisma = require('../lib/prisma.js')
const { nextRound, finishGame } = require('./RoomsService')

// In-memory timers state
// roomCode -> { timeLeft, duration, isActive, interval, currentRound, totalRounds }
const timers = {}

async function getOrInitTimer(roomCode) {
  if (!timers[roomCode]) {
    // Fetch room from DB to get current status, round, and total rounds
    const room = await prisma.room.findUnique({
      where: { code: roomCode }
    })
    timers[roomCode] = {
      timeLeft: 1200, // 20 min default
      duration: 1200,
      isActive: false,
      interval: null,
      currentRound: room ? room.currentRound : 0,
      totalRounds: room ? room.totalRounds : 4
    }
  } else {
    // Update round and totalRounds just in case they changed in DB
    const room = await prisma.room.findUnique({
      where: { code: roomCode }
    })
    if (room) {
      timers[roomCode].currentRound = room.currentRound
      timers[roomCode].totalRounds = room.totalRounds
    }
  }
  return timers[roomCode]
}

async function verifyFacilitator(roomCode, facilitatorToken) {
  const room = await prisma.room.findUnique({
    where: { code: roomCode }
  })
  return room && room.facilitatorToken === facilitatorToken
}

async function emitTimerUpdate(roomCode, io) {
  const timer = await getOrInitTimer(roomCode)
  io.to(roomCode).emit('server:timer-update', {
    timeLeft: timer.timeLeft,
    isActive: timer.isActive,
    currentRound: timer.currentRound,
    totalRounds: timer.totalRounds
  })
}

async function initTimer(roomCode, duration = 1200) {
  const timer = await getOrInitTimer(roomCode)
  timer.duration = duration
  timer.timeLeft = duration
  return timer
}

async function startTimer(roomCode, io, facilitatorToken) {
  const isFacilitator = await verifyFacilitator(roomCode, facilitatorToken)
  if (!isFacilitator) throw new Error('UNAUTHORIZED')

  const timer = await getOrInitTimer(roomCode)
  if (timer.isActive) return timer

  timer.isActive = true

  if (timer.interval) clearInterval(timer.interval)

  timer.interval = setInterval(async () => {
    if (timer.timeLeft <= 0) {
      clearInterval(timer.interval)
      timer.interval = null
      timer.isActive = false

      // Proteção contra double-advance: timer auto + clique manual simultâneo
      if (timer.isProcessingAutoAdvance) return
      timer.isProcessingAutoAdvance = true

      // Auto-advance round or end game when timer reaches 0
      try {
        const room = await prisma.room.findUnique({
          where: { code: roomCode }
        })
        if (room && room.status === 'IN_PROGRESS') {
          if (room.currentRound < room.totalRounds) {
            console.log(`[Timer] Auto-avançando rodada para sala: ${roomCode}`)
            await nextRound({ code: roomCode, facilitatorToken }, io)
            
            // Reset for the next round
            await initTimer(roomCode, timer.duration)
            await startTimer(roomCode, io, facilitatorToken)
          } else {
            console.log(`[Timer] Auto-finalizando jogo para sala: ${roomCode}`)
            await finishGame({ code: roomCode, facilitatorToken }, io)
          }
        }
      } catch (err) {
        console.error('[Timer] Erro ao auto-avançar rodada:', err)
      } finally {
        timer.isProcessingAutoAdvance = false
      }
      return
    }

    timer.timeLeft -= 1
    await emitTimerUpdate(roomCode, io)
  }, 1000)


  await emitTimerUpdate(roomCode, io)
  return timer
}

async function pauseTimer(roomCode, io, facilitatorToken) {
  const isFacilitator = await verifyFacilitator(roomCode, facilitatorToken)
  if (!isFacilitator) throw new Error('UNAUTHORIZED')

  const timer = await getOrInitTimer(roomCode)
  if (!timer.isActive) return timer

  timer.isActive = false
  if (timer.interval) {
    clearInterval(timer.interval)
    timer.interval = null
  }

  await emitTimerUpdate(roomCode, io)
  return timer
}

async function addTime(roomCode, io, facilitatorToken, amount = 60) {
  const isFacilitator = await verifyFacilitator(roomCode, facilitatorToken)
  if (!isFacilitator) throw new Error('UNAUTHORIZED')

  const timer = await getOrInitTimer(roomCode)
  timer.timeLeft = Math.min(timer.timeLeft + amount, timer.duration * 2)

  await emitTimerUpdate(roomCode, io)
  return timer
}

async function subtractTime(roomCode, io, facilitatorToken, amount = 60) {
  const isFacilitator = await verifyFacilitator(roomCode, facilitatorToken)
  if (!isFacilitator) throw new Error('UNAUTHORIZED')

  const timer = await getOrInitTimer(roomCode)
  timer.timeLeft = Math.max(timer.timeLeft - amount, 0)

  await emitTimerUpdate(roomCode, io)
  return timer
}

// Clears timer when round is manually advanced or finished
async function clearTimerState(roomCode) {
  const timer = timers[roomCode]
  if (timer) {
    if (timer.interval) {
      clearInterval(timer.interval)
    }
    delete timers[roomCode]
  }
}

module.exports = {
  getOrInitTimer,
  initTimer,
  startTimer,
  pauseTimer,
  addTime,
  subtractTime,
  clearTimerState,
  emitTimerUpdate,
  timers
}
