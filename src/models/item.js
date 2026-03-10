const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: String,
  dataCriacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', ItemSchema);