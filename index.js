require('dotenv').config({ path: '.env.local' });
const express = require('express');
const totalReportsHandler = require('./api/total-reports'); // ou o caminho correto

const app = express();
const PORT = 3000;

app.get('/api/total-reports', async (req, res) => {
  await totalReportsHandler(req, res);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor local rodando em http://localhost:${PORT}`);
});
