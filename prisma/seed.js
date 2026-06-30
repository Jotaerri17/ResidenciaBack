require('dotenv').config()
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

const pool = new Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const CATEGORIES = [
  'Perecíveis',
  'Mercearia',
  'Eletro',
  'Hipel',
  'Bebidas',
  'Higiene e Limpeza'
]

async function main() {
  console.log('🌱 Iniciando seed de categorias...')

  for (const name of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    })
    console.log(`  ✅ ${cat.name} (${cat.id})`)
  }

  console.log('\n✅ Seed concluído!')
}

main()
  .catch(e => { console.error('❌ Erro no seed:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
