const mongoose = require('mongoose');

const EmpresaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    manager: {
        type: String,
        required: true
    },
    caixa: {
        type: Number,
        default: 700000
    },
});
module.exports = mongoose.model('Empresa', EmpresaSchema);