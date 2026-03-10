const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Banco de dados conectado com sucesso!");
  } catch (err) {
    console.error("Erro ao conectar:", err);
    process.exit(1);
  }
};

module.exports = connectDB;