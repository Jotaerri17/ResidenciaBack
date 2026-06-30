const { listCategories, createCategory, updateCategory, deleteCategory } = require('../service/CategoryService')

async function handleList(req, res) {
  try {
    const categories = await listCategories()
    return res.status(200).json(categories)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Erro ao listar categorias.' })
  }
}

async function handleCreate(req, res) {
  try {
    const { name } = req.body
    const category = await createCategory(name)
    return res.status(201).json(category)
  } catch (e) {
    if (e.message === 'EMPTY_NAME') return res.status(400).json({ message: 'Nome da categoria é obrigatório.' })
    if (e.message === 'DUPLICATE_NAME') return res.status(409).json({ message: 'Já existe uma categoria com esse nome.' })
    console.error(e)
    return res.status(500).json({ message: 'Erro ao criar categoria.' })
  }
}

async function handleUpdate(req, res) {
  try {
    const { id } = req.params
    const { name } = req.body
    const category = await updateCategory(id, name)
    return res.status(200).json(category)
  } catch (e) {
    if (e.message === 'EMPTY_NAME') return res.status(400).json({ message: 'Nome da categoria é obrigatório.' })
    if (e.message === 'NOT_FOUND') return res.status(404).json({ message: 'Categoria não encontrada.' })
    if (e.message === 'DUPLICATE_NAME') return res.status(409).json({ message: 'Já existe uma categoria com esse nome.' })
    console.error(e)
    return res.status(500).json({ message: 'Erro ao atualizar categoria.' })
  }
}

async function handleDelete(req, res) {
  try {
    const { id } = req.params
    await deleteCategory(id)
    return res.status(204).send()
  } catch (e) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ message: 'Categoria não encontrada.' })
    if (e.message === 'HAS_QUESTIONS') return res.status(409).json({ message: 'Não é possível excluir uma categoria que possui perguntas vinculadas.' })
    console.error(e)
    return res.status(500).json({ message: 'Erro ao excluir categoria.' })
  }
}

module.exports = { handleList, handleCreate, handleUpdate, handleDelete }
