const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal para INARA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Servidor de EMPRESA-INARA corriendo en http://localhost:${port}`);
});