const { Router } = require  ('express')
const roomController = require ('../controller/RoomsController.js')

const router = Router()

router.post('/', roomController.handleCreateRoom)       // criar sala
router.get('/:code', roomController.handleGetRoom)      // buscar sala pelo código

module.exports = router