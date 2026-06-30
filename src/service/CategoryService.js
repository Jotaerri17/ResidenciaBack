const prisma = require('../lib/prisma')

async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { questions: true } } }
  })
}

async function createCategory(name) {
  if (!name || !name.trim()) throw new Error('EMPTY_NAME')
  const existing = await prisma.category.findUnique({ where: { name: name.trim() } })
  if (existing) throw new Error('DUPLICATE_NAME')
  return prisma.category.create({ data: { name: name.trim() } })
}

async function updateCategory(id, name) {
  if (!name || !name.trim()) throw new Error('EMPTY_NAME')
  const cat = await prisma.category.findUnique({ where: { id } })
  if (!cat) throw new Error('NOT_FOUND')
  const duplicate = await prisma.category.findFirst({
    where: { name: name.trim(), id: { not: id } }
  })
  if (duplicate) throw new Error('DUPLICATE_NAME')
  return prisma.category.update({ where: { id }, data: { name: name.trim() } })
}

async function deleteCategory(id) {
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { questions: true } } }
  })
  if (!cat) throw new Error('NOT_FOUND')
  if (cat._count.questions > 0) throw new Error('HAS_QUESTIONS')
  return prisma.category.delete({ where: { id } })
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory }
