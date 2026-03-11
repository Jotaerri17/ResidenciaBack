const express = require('express');
const router = express.Router();
const EmpresaController = require('../controller/EmpresaController.js');

// Rotas de Empresa
router.post('/create', EmpresaController.create);
router.get('/get/:id', EmpresaController.getById);

module.exports = router;