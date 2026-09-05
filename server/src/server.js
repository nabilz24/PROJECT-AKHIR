// Entry point (TASK-010). Usage: node server/src/server.js (atau: npm run dev / npm start)
const { createApp } = require('./app');
const { runMigrations } = require('./db/migrate');
const config = require('./config');

runMigrations();
const app = createApp();
app.listen(config.port, () => {
  console.log(`Campus Industry Talent Hub API listening on http://localhost:${config.port}`);
});
