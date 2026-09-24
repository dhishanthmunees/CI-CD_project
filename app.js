
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`<h1>Devops CI/CD Pipeline Automation!</h1><p>Deployed via Jenkins + Docker</p><p>Build: ${process.env.BUILD_NUMBER || 'local'}</p>`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.listen(PORT, () => console.log(`App running on port ${PORT}`));
