'use strict';

const { createDatabase, openDatabase } = require('../core/permission-lab/database');
const { createService, seedAccounts } = require('../core/permission-lab/service');
const { createApp } = require('../core/permission-lab/http');
const { loadCatalog } = require('../core/permission-lab/catalog');

// No dotenv, production imports, migrations or existing session database.
if (process.env.NODE_ENV === 'production') throw new Error('本工具禁止在 production 模式启动');
const port = Number(process.env.PERMISSION_LAB_PORT || 3317);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || [3000, 3001, 3010].includes(port)) throw new Error('请选择独立测试端口');
const catalog = loadCatalog();
const existing = process.env.PERMISSION_LAB_DB;
if (!existing && (!process.env.PERMISSION_LAB_ADMIN_PASSWORD || !process.env.PERMISSION_LAB_DEMO_PASSWORD)) throw new Error('首次启动须设置 PERMISSION_LAB_ADMIN_PASSWORD 和 PERMISSION_LAB_DEMO_PASSWORD；不会读取真实账号密码');
const { db, filename } = existing ? openDatabase(existing) : createDatabase();
try {
  if (!existing) seedAccounts(db, { adminPassword: process.env.PERMISSION_LAB_ADMIN_PASSWORD, demoPassword: process.env.PERMISSION_LAB_DEMO_PASSWORD });
  const service = createService(db, catalog);
  const app = createApp(service, { origin: process.env.PERMISSION_LAB_ORIGIN || 'http://127.0.0.1:5180', cookieName: `permission_lab_${port}` });
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Permission lab: http://127.0.0.1:${port}`);
    console.log(`Isolated database: ${filename}`);
    console.log('Local only. No real email. Existing accounts and services are not connected.');
  });
  server.on('error', error => { db.close(); console.error(error.message); process.exitCode = 1; });
  const close = () => server.close(() => { db.close(); process.exit(0); });
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
} catch (error) { db.close(); throw error; }
