const router = require('express').Router()
const { handleSaveConfig } = require('../controller/CompanyConfigController')

router.post('/', handleSaveConfig)

module.exports = router
