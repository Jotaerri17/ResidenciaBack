require('dotenv').config();

const express = require('express')
const cors = require('cors')

// 2. Importação das rotas (AGORA COM REQUIRE)
const roomsRoutes = require('./routes/RoomsRoutes')

// Prisma
const prisma = require('./lib/prisma')
prisma.$connect()
  .then(() => console.log('✅ Conectado ao banco!'))
  .catch((err) => console.error('❌ Erro na conexão:', err.message))

const app = express()

// 3. Middlewares
app.use(cors({
  origin: '*'
}));

app.use(express.json());

// ==========================================
// 4. doc
// ==========================================


const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./docs/swagger')

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// ==========================================
// 4. ROTAS DA APLICAÇÃO
// ==========================================

app.use('/rooms', roomsRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: "🚀 API Express funcionando com Postgres e Neon!" });
});

app.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.user.findMany(); // 👈 aqui também corrigi
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no prisma" });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ mensagem: "O Frontend está falando com o Backend com sucesso!" });
});

// ==========================================
// 5. INICIANDO O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});