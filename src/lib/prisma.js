const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Pega a URL do banco que está no seu .env
const connectionString = process.env.DATABASE_URL;

console.log('🔍 URL do banco:', connectionString ? '✅ encontrada' : '❌ undefined')
// Cria a conexão com o Postgres usando o driver oficial (pg)
const pool = new Pool({ connectionString,
    ssl: {
        rejectUnauthorized: true
    }
});
const adapter = new PrismaPg(pool);

// Passa o adapter para o PrismaClient (como o Prisma 7 exige)
const prisma = new PrismaClient({ adapter });

module.exports = prisma;