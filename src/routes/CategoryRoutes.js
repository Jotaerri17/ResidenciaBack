const { Router } = require('express')
const { handleList, handleCreate, handleUpdate, handleDelete } = require('../controller/CategoryController')

const router = Router()

router.get('/', handleList)
router.post('/', handleCreate)
router.put('/:id', handleUpdate)
router.delete('/:id', handleDelete)

module.exports = router
