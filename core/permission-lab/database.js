'use strict';

// Never import db/schema.js here: that module migrates/seeds the real database.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const PURPOSE = 'leaibot-permission-lab-v1';

function createDatabase() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'leaibot-permission-lab-'));
  const filename = path.join(directory, 'permission-lab.sqlite');
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE lab_metadata (purpose TEXT NOT NULL);
    CREATE TABLE identities (
      username TEXT PRIMARY KEY, person_type TEXT NOT NULL CHECK(person_type IN ('internal','external')),
      email TEXT NOT NULL, manager TEXT REFERENCES identities(username)
    );
    CREATE TABLE accounts (
      username TEXT PRIMARY KEY REFERENCES identities(username), password_hash TEXT NOT NULL,
      enabled INTEGER NOT NULL CHECK(enabled IN (0,1)), workbench_access INTEGER NOT NULL CHECK(workbench_access IN (0,1)),
      system_admin INTEGER NOT NULL DEFAULT 0 CHECK(system_admin IN (0,1)), permissions TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE requests (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('enable','first-access')),
      target TEXT NOT NULL REFERENCES accounts(username), applicant TEXT NOT NULL REFERENCES identities(username),
      status TEXT NOT NULL CHECK(status IN ('pending','done','rejected')), node TEXT NOT NULL,
      approver TEXT NOT NULL REFERENCES identities(username), revision INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX one_pending_request ON requests(kind,target) WHERE status='pending';
    CREATE TABLE decisions (
      request_id TEXT NOT NULL REFERENCES requests(id), revision INTEGER NOT NULL,
      actor TEXT NOT NULL REFERENCES identities(username), decision TEXT NOT NULL, opinion TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(request_id, revision)
    );
    CREATE TABLE mail_grants (
      token_hash TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id),
      approver TEXT NOT NULL REFERENCES identities(username), node TEXT NOT NULL, revision INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE mock_mail (
      id INTEGER PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id),
      recipient TEXT NOT NULL, node TEXT NOT NULL, token TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE account_scope (
      username TEXT PRIMARY KEY REFERENCES accounts(username), request_id TEXT NOT NULL REFERENCES requests(id),
      scope TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `);
  db.prepare('INSERT INTO lab_metadata VALUES (?)').run(PURPOSE);
  return { db, filename };
}

function openDatabase(filename) {
  const resolved = path.resolve(filename);
  const parent = path.dirname(resolved);
  if (path.basename(resolved) !== 'permission-lab.sqlite'
    || !path.basename(parent).startsWith('leaibot-permission-lab-')
    || fs.realpathSync(parent) !== parent || fs.lstatSync(resolved).isSymbolicLink()) {
    throw new Error('只允许打开本工具创建的独立 permission-lab.sqlite');
  }
  const inspect = new Database(resolved, { readonly: true, fileMustExist: true });
  try {
    if (inspect.prepare('SELECT purpose FROM lab_metadata').get()?.purpose !== PURPOSE) throw new Error('数据库隔离标记不匹配');
    if (inspect.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('admin_users','users')").get()) throw new Error('拒绝打开包含真实账号表的数据库');
  } finally { inspect.close(); }
  const db = new Database(resolved, { fileMustExist: true });
  db.pragma('foreign_keys = ON');
  return { db, filename: resolved };
}

module.exports = { createDatabase, openDatabase };
