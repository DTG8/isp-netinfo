const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/companies',  require('./routes/companies'));
app.use('/api/links',      require('./routes/links'));
app.use('/api/customers',  require('./routes/customers'));

// Catch-all: serve frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Init DB schema then start listening
db.initSchema().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅  ISP NetInfo running at http://localhost:${PORT}`);
    console.log(`   Network access: http://<your-ip>:${PORT}`);
    console.log(`   Press Ctrl+C to stop\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
