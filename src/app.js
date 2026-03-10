// 1. Carrega as variáveis do arquivo .env
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// 2. Middlewares essenciais
app.use(cors({
  origin: '*' // Permite que qualquer front acesse. (Em produção, colocamos o domínio do seu site aqui)
})); // Permite que seu Front (React/HTML) acesse o Back
app.use(express.json()); // Permite que o app entenda arquivos JSON

// 3. Conexão com o MongoDB
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

/*mongoose.connect 
  .then(() => {
    console.log("Conectado ao MongoDB com sucesso!");
    // Só inicia o servidor se o banco conectar
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err);
  }); */

// 4. Exemplo de uma rota de teste (seu primeiro endpoint)
app.get('/', (req, res) => {
  res.json({ mensagem: "API funcionando e conectada ao banco!" });
});


app.get('/api/test', (req, res) => {
  res.json({ mensagem: "O Frontend está falando com o Backend com sucesso!" });
});
app.listen(3000, () => console.log('Servidor rodando na porta 3000'));