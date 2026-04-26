const crypto = require('node:crypto');
const http = require('node:http');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');
let DatabaseSync = null;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  DatabaseSync = null;
}

const ROOT_DIR = __dirname;

function loadLocalEnvFile(filePath) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(filePath);
      return;
    }
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
    return;
  }

  let contents = '';
  try {
    contents = fsSync.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) {
      continue;
    }

    let value = rawValue.trim();
    const isWrappedInSingleQuotes = value.startsWith("'") && value.endsWith("'");
    const isWrappedInDoubleQuotes = value.startsWith('"') && value.endsWith('"');

    if (isWrappedInSingleQuotes || isWrappedInDoubleQuotes) {
      value = value.slice(1, -1);
      if (isWrappedInDoubleQuotes) {
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }

    process.env[key] = value;
  }
}

loadLocalEnvFile(path.join(ROOT_DIR, '.env'));

function normalizeOriginValue(value, fallbackProtocol = 'https') {
  const text = String(value || '').trim();
  if (!text) return '';
  const candidate = /^https?:\/\//i.test(text)
    ? text
    : `${fallbackProtocol}://${text}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return '';
  }
}

function getManagedPublicBaseUrl() {
  return normalizeOriginValue(process.env.RENDER_EXTERNAL_HOSTNAME)
    || normalizeOriginValue(process.env.RAILWAY_PUBLIC_DOMAIN)
    || '';
}

function getManagedDataDir() {
  const explicitDir = String(process.env.APP_DATA_DIR || '').trim();
  if (explicitDir) {
    return path.resolve(explicitDir);
  }
  const railwayVolumePath = String(process.env.RAILWAY_VOLUME_MOUNT_PATH || '').trim();
  if (railwayVolumePath) {
    return path.resolve(railwayVolumePath);
  }
  return '';
}

const IS_MANAGED_PLATFORM = Boolean(
  process.env.RENDER
  || process.env.RENDER_EXTERNAL_HOSTNAME
  || process.env.RAILWAY_SERVICE_NAME
  || process.env.RAILWAY_PUBLIC_DOMAIN
  || process.env.RAILWAY_ENVIRONMENT
);
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || (NODE_ENV === 'production' || IS_MANAGED_PLATFORM ? '0.0.0.0' : '127.0.0.1');
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(ROOT_DIR, 'data');
const JSON_SEED_FILES = [
  path.join(ROOT_DIR, 'seed', 'app-state.json'),
  path.join(DATA_DIR, 'app-state.json')
];
const MANAGED_DATA_DIR = getManagedDataDir();
const JSON_STATE_FILE = path.resolve(process.env.JSON_STATE_FILE || path.join(MANAGED_DATA_DIR || DATA_DIR, 'app-state.json'));
const DEFAULT_SQLITE_DIR = (() => {
  if (MANAGED_DATA_DIR) {
    return MANAGED_DATA_DIR;
  }
  if (process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'cog-management-system');
  }
  if (process.env.XDG_DATA_HOME) {
    return path.join(process.env.XDG_DATA_HOME, 'cog-management-system');
  }
  if (process.env.HOME) {
    return path.join(process.env.HOME, '.local', 'share', 'cog-management-system');
  }
  return path.join(DATA_DIR, 'sqlite');
})();
const SQLITE_STATE_FILE = path.resolve(process.env.SQLITE_STATE_FILE || path.join(DEFAULT_SQLITE_DIR, 'app-state.sqlite'));
const PREFERRED_STORAGE_PROVIDER = String(process.env.STORAGE_PROVIDER || 'json').trim().toLowerCase() === 'sqlite' ? 'sqlite' : 'json';
const PUBLIC_BASE_URL = normalizeOriginValue(process.env.PUBLIC_BASE_URL || getManagedPublicBaseUrl());
const CORS_ORIGIN = normalizeOriginValue(process.env.CORS_ORIGIN || PUBLIC_BASE_URL);
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_AUDIT_LOGS = 80;
const MAX_REQUEST_BODY_BYTES = Number(process.env.MAX_REQUEST_BODY_BYTES || (10 * 1024 * 1024));
const ROLE_OPTIONS = ['Admin', 'Finance', 'Secretary', 'Viewer'];
const sessions = new Map();
let sqliteDb = null;
let activeStorageProvider = PREFERRED_STORAGE_PROVIDER;

const DEFAULT_STATE = {
  members: [],
  incomes: [],
  expenses: [],
  borrowings: [],
  contributions: [],
  budgets: [],
  activityCategories: [],
  activities: [],
  attendanceRecords: [],
  visitors: [],
  users: [],
  auditLogs: [],
  appSettings: {
    organizationName: 'Addis Ababa COG Management System',
    churchName: 'Church of God Addis Ababa',
    locale: 'en-ET',
    adminUsername: 'admin',
    adminPassword: '1234',
    theme: 'light',
    fontScale: 100,
    reducedMotion: false,
    lastBackupAt: ''
  }
};

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function sanitizeUsername(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.replace(/[^a-z0-9._-]/g, '');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').trim();
}

function isValidEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidPhone(value) {
  if (!value) return true;
  const text = String(value).trim();
  if (!/^[+\d][\d\s().-]*$/.test(text)) return false;
  const digits = text.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function findUserByEmail(users, email, excludeUserId) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return (Array.isArray(users) ? users : []).find((user) => normalizeEmail(user.email) === normalizedEmail && user.id !== excludeUserId) || null;
}

function validateUsernameValue(rawValue, existingUsers, excludeUserId) {
  const typedUsername = String(rawValue || '').trim();
  const sanitizedUsername = sanitizeUsername(typedUsername);
  if (!typedUsername) {
    return { ok: false, message: 'Choose a username.' };
  }
  if (!sanitizedUsername) {
    return { ok: false, message: 'Username can only use letters, numbers, dot, dash, and underscore.' };
  }
  const duplicateUser = (Array.isArray(existingUsers) ? existingUsers : []).find((user) => user.username === sanitizedUsername && user.id !== excludeUserId);
  if (duplicateUser) {
    return {
      ok: false,
      message: typedUsername === sanitizedUsername
        ? 'That username is already in use.'
        : `That username becomes @${sanitizedUsername} after removing spaces or special characters, and that username is already in use.`
    };
  }
  return {
    ok: true,
    username: sanitizedUsername
  };
}

function normalizeRole(role) {
  return ROLE_OPTIONS.includes(role) ? role : 'Viewer';
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, hash] = String(passwordHash || '').split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(String(password || ''), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function normalizeAppSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    organizationName: String(source.organizationName || DEFAULT_STATE.appSettings.organizationName).trim() || DEFAULT_STATE.appSettings.organizationName,
    churchName: String(source.churchName || DEFAULT_STATE.appSettings.churchName).trim() || DEFAULT_STATE.appSettings.churchName,
    locale: source.locale || DEFAULT_STATE.appSettings.locale,
    adminUsername: sanitizeUsername(source.adminUsername || DEFAULT_STATE.appSettings.adminUsername) || DEFAULT_STATE.appSettings.adminUsername,
    adminPassword: String(source.adminPassword || DEFAULT_STATE.appSettings.adminPassword),
    theme: source.theme === 'dark' ? 'dark' : 'light',
    fontScale: Math.min(120, Math.max(90, Number(source.fontScale || DEFAULT_STATE.appSettings.fontScale))),
    reducedMotion: Boolean(source.reducedMotion),
    lastBackupAt: source.lastBackupAt || ''
  };
}

function createLegacyAdminUser(appSettings) {
  const createdAt = nowIso();
  return {
    id: 'usr_legacy_admin',
    name: 'System Admin',
    username: sanitizeUsername(appSettings.adminUsername || DEFAULT_STATE.appSettings.adminUsername) || DEFAULT_STATE.appSettings.adminUsername,
    email: '',
    phone: '',
    passwordHash: hashPassword(appSettings.adminPassword || DEFAULT_STATE.appSettings.adminPassword),
    role: 'Admin',
    active: true,
    createdAt,
    updatedAt: createdAt,
    lastLoginAt: ''
  };
}

function normalizeUser(value) {
  const source = value && typeof value === 'object' ? value : {};
  const username = sanitizeUsername(source.username);
  const passwordHash = String(source.passwordHash || '').trim() || (source.password ? hashPassword(source.password) : '');
  if (!username || !passwordHash) return null;
  const createdAt = source.createdAt || nowIso();
  return {
    id: String(source.id || createId('usr')),
    name: String(source.name || username).trim() || username,
    username,
    email: normalizeEmail(source.email),
    phone: normalizePhone(source.phone),
    passwordHash,
    role: normalizeRole(source.role),
    active: source.active !== false,
    createdAt,
    updatedAt: source.updatedAt || createdAt,
    lastLoginAt: source.lastLoginAt || ''
  };
}

function normalizeUsers(list, appSettings) {
  const normalized = Array.isArray(list)
    ? list.map(normalizeUser).filter(Boolean)
    : [];

  const deduped = [];
  const seen = new Set();
  for (const user of normalized) {
    const key = user.username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(user);
  }

  let users = deduped.length ? deduped : [createLegacyAdminUser(appSettings)];

  if (!users.some((user) => user.role === 'Admin' && user.active)) {
    const fallbackAdmin = createLegacyAdminUser(appSettings);
    if (!users.some((user) => user.username === fallbackAdmin.username)) {
      users.unshift(fallbackAdmin);
    } else {
      users = users.map((user) => (
        user.username === fallbackAdmin.username
          ? { ...user, role: 'Admin', active: true }
          : user
      ));
    }
  }

  return users.sort((left, right) => {
    if (left.role === 'Admin' && right.role !== 'Admin') return -1;
    if (left.role !== 'Admin' && right.role === 'Admin') return 1;
    if (left.active !== right.active) return left.active ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

function normalizeAuditEntry(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    id: String(source.id || createId('audit')),
    action: String(source.action || 'System update').trim() || 'System update',
    actorId: String(source.actorId || ''),
    actorName: String(source.actorName || 'System').trim() || 'System',
    details: String(source.details || '').trim(),
    createdAt: source.createdAt || nowIso()
  };
}

function normalizeAuditLogs(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeAuditEntry)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, MAX_AUDIT_LOGS);
}

function normalizeState(input) {
  const source = input && typeof input === 'object' ? input : {};
  const appSettings = normalizeAppSettings(source.appSettings);
  const users = normalizeUsers(source.users, appSettings);

  return {
    members: Array.isArray(source.members) ? source.members : [],
    incomes: Array.isArray(source.incomes) ? source.incomes : [],
    expenses: Array.isArray(source.expenses) ? source.expenses : [],
    borrowings: Array.isArray(source.borrowings) ? source.borrowings : [],
    contributions: Array.isArray(source.contributions) ? source.contributions : [],
    budgets: Array.isArray(source.budgets) ? source.budgets : [],
    activityCategories: Array.isArray(source.activityCategories) ? source.activityCategories : [],
    activities: Array.isArray(source.activities) ? source.activities : [],
    attendanceRecords: Array.isArray(source.attendanceRecords) ? source.attendanceRecords : [],
    visitors: Array.isArray(source.visitors) ? source.visitors : [],
    users,
    auditLogs: normalizeAuditLogs(source.auditLogs),
    appSettings
  };
}

function getStorageProvider() {
  return activeStorageProvider === 'sqlite' ? 'sqlite' : 'json';
}

function getStorageDescriptor() {
  return getStorageProvider() === 'sqlite'
    ? `SQLite (${SQLITE_STATE_FILE})`
    : `JSON (${JSON_STATE_FILE})`;
}

function fallbackToJsonStorage(reason, error) {
  if (getStorageProvider() === 'json') {
    return;
  }
  const detail = error && error.message ? ` ${error.message}` : '';
  console.warn(`SQLite storage is unavailable.${reason ? ` ${reason}` : ''}${detail} Falling back to JSON storage at ${JSON_STATE_FILE}.`);
  activeStorageProvider = 'json';
  if (sqliteDb) {
    try {
      sqliteDb.close();
    } catch {
      // Ignore close errors while falling back.
    }
    sqliteDb = null;
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonStateFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return normalizeState(JSON.parse(raw));
}

async function writeJsonStateFile(filePath, state) {
  const normalized = normalizeState(state);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), 'utf8');
  try {
    await fs.rename(tempPath, filePath);
  } catch (error) {
    if (error && (error.code === 'EPERM' || error.code === 'EEXIST')) {
      await fs.copyFile(tempPath, filePath);
      await fs.unlink(tempPath).catch(() => {});
    } else {
      throw error;
    }
  }
  return normalized;
}

async function loadSeedStateFromJsonFiles(filePaths) {
  for (const filePath of filePaths) {
    if (!filePath) continue;
    if (!(await pathExists(filePath))) continue;
    try {
      return await readJsonStateFile(filePath);
    } catch (error) {
      console.warn(`JSON seed file could not be read: ${filePath}`, error);
    }
  }
  return normalizeState(DEFAULT_STATE);
}

async function ensureJsonStateFile() {
  await fs.mkdir(path.dirname(JSON_STATE_FILE), { recursive: true });
  if (!(await pathExists(JSON_STATE_FILE))) {
    const seededState = await loadSeedStateFromJsonFiles([
      JSON_STATE_FILE,
      ...JSON_SEED_FILES.filter((filePath) => path.resolve(filePath) !== JSON_STATE_FILE)
    ]);
    await writeJsonStateFile(JSON_STATE_FILE, seededState);
  }
}

function getSqliteDatabase() {
  if (getStorageProvider() !== 'sqlite') {
    throw new Error('SQLite storage is not active.');
  }
  if (!DatabaseSync) {
    throw new Error('SQLite storage requires a Node.js runtime with node:sqlite support.');
  }
  if (!sqliteDb) {
    sqliteDb = new DatabaseSync(SQLITE_STATE_FILE);
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }
  return sqliteDb;
}

function readSqliteStateRow() {
  const db = getSqliteDatabase();
  return db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
}

function readSqliteState() {
  const row = readSqliteStateRow();
  if (!row || !row.state_json) {
    return null;
  }
  return normalizeState(JSON.parse(row.state_json));
}

function writeSqliteState(state) {
  const normalized = normalizeState(state);
  const db = getSqliteDatabase();
  db.prepare(`
    INSERT INTO app_state (id, state_json, updated_at)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(normalized), nowIso());
  return normalized;
}

async function ensureSqliteState() {
  await fs.mkdir(path.dirname(SQLITE_STATE_FILE), { recursive: true });
  const seededState = await loadSeedStateFromJsonFiles([
    JSON_STATE_FILE,
    ...JSON_SEED_FILES.filter((filePath) => path.resolve(filePath) !== JSON_STATE_FILE)
  ]);
  const currentState = readSqliteState();
  if (!currentState) {
    writeSqliteState(seededState);
  }
}

async function ensureStateStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  if (getStorageProvider() === 'sqlite') {
    try {
      await ensureSqliteState();
      return;
    } catch (error) {
      fallbackToJsonStorage('Requested SQLite storage could not be initialized.', error);
    }
  }
  await ensureJsonStateFile();
}

async function readState() {
  await ensureStateStore();
  if (getStorageProvider() === 'sqlite') {
    try {
      const state = readSqliteState();
      if (state) {
        return state;
      }
      const fallbackState = normalizeState(DEFAULT_STATE);
      writeSqliteState(fallbackState);
      return fallbackState;
    } catch (error) {
      fallbackToJsonStorage('SQLite read failed.', error);
      await ensureJsonStateFile();
    }
  }
  try {
    return await readJsonStateFile(JSON_STATE_FILE);
  } catch (error) {
    console.error('Failed to read state file, resetting to defaults.', error);
    await writeJsonStateFile(JSON_STATE_FILE, DEFAULT_STATE);
    return normalizeState(DEFAULT_STATE);
  }
}

async function writeState(state) {
  const normalized = normalizeState(state);
  await ensureStateStore();
  if (getStorageProvider() === 'sqlite') {
    try {
      return writeSqliteState(normalized);
    } catch (error) {
      fallbackToJsonStorage('SQLite write failed.', error);
      await ensureJsonStateFile();
    }
  }
  return writeJsonStateFile(JSON_STATE_FILE, normalized);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: normalizeEmail(user.email),
    phone: normalizePhone(user.phone),
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt
  };
}

function sanitizeAppSettingsForClient(appSettings) {
  return {
    ...appSettings,
    adminPassword: ''
  };
}

function sanitizeStateForClient(state) {
  return {
    members: state.members,
    incomes: state.incomes,
    expenses: state.expenses,
    borrowings: state.borrowings,
    contributions: state.contributions,
    budgets: state.budgets,
    activityCategories: state.activityCategories,
    activities: state.activities,
    attendanceRecords: state.attendanceRecords,
    visitors: state.visitors,
    appSettings: sanitizeAppSettingsForClient(state.appSettings)
  };
}

function findPrimaryAdmin(state) {
  const preferredUsername = sanitizeUsername(state.appSettings.adminUsername);
  return state.users.find((user) => user.username === preferredUsername)
    || state.users.find((user) => user.role === 'Admin' && user.active)
    || state.users[0]
    || null;
}

function appendAuditLog(state, action, actor, details) {
  const nextLogs = [
    normalizeAuditEntry({
      action,
      actorId: actor && actor.id ? actor.id : '',
      actorName: actor && actor.name ? actor.name : 'System',
      details
    }),
    ...normalizeAuditLogs(state.auditLogs)
  ].slice(0, MAX_AUDIT_LOGS);

  return {
    ...state,
    auditLogs: nextLogs
  };
}

function mergeClientState(currentState, clientState) {
  const source = clientState && typeof clientState === 'object' ? clientState : {};
  const clientSettings = source.appSettings && typeof source.appSettings === 'object' ? source.appSettings : {};
  const merged = normalizeState({
    ...currentState,
    members: source.members,
    incomes: source.incomes,
    expenses: source.expenses,
    borrowings: source.borrowings,
    contributions: source.contributions,
    budgets: source.budgets,
    activityCategories: source.activityCategories,
    activities: source.activities,
    attendanceRecords: source.attendanceRecords,
    visitors: source.visitors,
    appSettings: {
      ...currentState.appSettings,
      ...clientSettings,
      adminUsername: currentState.appSettings.adminUsername,
      adminPassword: currentState.appSettings.adminPassword
    },
    users: currentState.users,
    auditLogs: currentState.auditLogs
  });

  return {
    ...merged,
    users: currentState.users,
    auditLogs: currentState.auditLogs
  };
}

function isInitialSignupAllowed(state) {
  const activeUsers = state.users.filter((user) => user.active);
  return activeUsers.length === 1
    && activeUsers[0].role === 'Admin'
    && activeUsers[0].username === sanitizeUsername(DEFAULT_STATE.appSettings.adminUsername)
    && verifyPassword(DEFAULT_STATE.appSettings.adminPassword, activeUsers[0].passwordHash);
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

function createSession(userId) {
  cleanupExpiredSessions();
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  return token;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

function getTokenFromRequest(request) {
  const header = String(request.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function getAuthenticatedUser(request, state) {
  cleanupExpiredSessions();
  const token = getTokenFromRequest(request);
  if (!token) return { token: '', user: null };
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    destroySession(token);
    return { token: '', user: null };
  }
  const user = state.users.find((entry) => entry.id === session.userId && entry.active);
  if (!user) {
    destroySession(token);
    return { token: '', user: null };
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return { token, user };
}

function getAllowedOrigin(request) {
  if (CORS_ORIGIN) {
    return CORS_ORIGIN;
  }
  const requestOrigin = String(request && request.headers ? request.headers.origin || '' : '').trim();
  return requestOrigin || '*';
}

function buildResponseHeaders(request, extraHeaders) {
  return {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, buildResponseHeaders(null, {
    'Content-Type': 'application/json; charset=utf-8'
  }));
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, buildResponseHeaders(null, { 'Content-Type': 'text/plain; charset=utf-8' }));
  response.end(text);
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BODY_BYTES) {
      throw new Error(`Request body is too large. Limit is ${Math.round(MAX_REQUEST_BODY_BYTES / (1024 * 1024))} MB.`);
    }
    chunks.push(chunk);
  }
  const bodyText = Buffer.concat(chunks).toString('utf8');
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

function requireAuth(request, response, state) {
  const auth = getAuthenticatedUser(request, state);
  if (!auth.user) {
    sendJson(response, 401, {
      ok: false,
      message: 'Authentication required.'
    });
    return null;
  }
  return auth;
}

function requireAdmin(request, response, state) {
  const auth = requireAuth(request, response, state);
  if (!auth) return null;
  if (auth.user.role !== 'Admin') {
    sendJson(response, 403, {
      ok: false,
      message: 'Admin access is required.'
    });
    return null;
  }
  return auth;
}

function validateNewUserPayload(body, existingUsers, currentUserId) {
  const usernameValidation = validateUsernameValue(body.username, existingUsers, currentUserId);
  if (!usernameValidation.ok) {
    return { ok: false, message: usernameValidation.message };
  }
  const username = usernameValidation.username;
  const name = String(body.name || '').trim() || username;
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const role = normalizeRole(body.role);
  const password = String(body.password || '');
  const active = body.active !== false;

  if (!isValidEmail(email)) {
    return { ok: false, message: 'Enter a valid email address or leave it empty.' };
  }

  if (!isValidPhone(phone)) {
    return { ok: false, message: 'Enter a valid phone number or leave it empty.' };
  }

  if (findUserByEmail(existingUsers, email, currentUserId)) {
    return { ok: false, message: 'That email is already linked to another account.' };
  }

  if (!currentUserId && password.length < 4) {
    return { ok: false, message: 'Password must be at least 4 characters.' };
  }

  if (currentUserId && password && password.length < 4) {
    return { ok: false, message: 'New password must be at least 4 characters.' };
  }

  return {
    ok: true,
    value: {
      username,
      name,
      email,
      phone,
      role,
      password,
      active
    }
  };
}

function normalizeSelfSignupRole(role) {
  const normalized = normalizeRole(role);
  return ['Finance', 'Secretary', 'Viewer'].includes(normalized) ? normalized : 'Viewer';
}

function resolveStaticPath(pathname) {
  const safePath = pathname === '/' || pathname === '/app'
    ? '/index.html'
    : pathname;
  const resolvedPath = path.normalize(path.join(ROOT_DIR, safePath));
  if (!resolvedPath.startsWith(ROOT_DIR)) {
    return null;
  }
  return resolvedPath;
}

async function serveStaticFile(response, pathname) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    const cacheControl = extension === '.html'
      ? 'no-cache'
      : 'public, max-age=3600';
    response.writeHead(200, buildResponseHeaders(null, {
      'Cache-Control': cacheControl,
      'Content-Type': contentType
    }));
    response.end(content);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

async function handleApi(request, response, pathname) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, buildResponseHeaders(request));
    response.end();
    return;
  }

  if (pathname === '/api/health' && request.method === 'GET') {
    const state = await readState();
    sendJson(response, 200, {
      ok: true,
      mode: 'node-http + full-stack api',
      environment: NODE_ENV,
      port: PORT,
      host: HOST,
      publicBaseUrl: PUBLIC_BASE_URL || `http://${HOST}:${PORT}`,
      storage: {
        provider: getStorageProvider(),
        requestedProvider: PREFERRED_STORAGE_PROVIDER,
        descriptor: getStorageDescriptor(),
        fallbackActive: getStorageProvider() !== PREFERRED_STORAGE_PROVIDER
      },
      roles: ROLE_OPTIONS,
      users: state.users.length
    });
    return;
  }

  if (pathname === '/api/state' && request.method === 'GET') {
    const state = await readState();
    sendJson(response, 200, {
      ok: true,
      state: sanitizeStateForClient(state),
      authMeta: {
        signupAllowed: isInitialSignupAllowed(state)
      }
    });
    return;
  }

  if (pathname === '/api/state' && request.method === 'PUT') {
    try {
      const currentState = await readState();
      const auth = requireAuth(request, response, currentState);
      if (!auth) return;
      const nextState = await readRequestBody(request);
      const mergedState = mergeClientState(currentState, nextState);
      const auditedState = appendAuditLog(
        mergedState,
        'State Sync',
        auth.user,
        'Application data was saved from the web client.'
      );
      const savedState = await writeState(auditedState);
      sendJson(response, 200, {
        ok: true,
        message: 'State saved successfully.',
        state: sanitizeStateForClient(savedState)
      });
    } catch (error) {
      console.error('Failed to save state.', error);
      sendJson(response, 400, {
        ok: false,
        message: error.message || 'Invalid state payload.'
      });
    }
    return;
  }

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    try {
      const body = await readRequestBody(request);
      const username = sanitizeUsername(body.username);
      const password = String(body.password || '');
      const state = await readState();
      const user = state.users.find((entry) => entry.username === username && entry.active);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        sendJson(response, 401, {
          ok: false,
          message: 'Invalid username or password.'
        });
        return;
      }

      const updatedUsers = state.users.map((entry) => (
        entry.id === user.id
          ? { ...entry, lastLoginAt: nowIso(), updatedAt: nowIso() }
          : entry
      ));
      const loggedState = appendAuditLog(
        { ...state, users: updatedUsers },
        'Login',
        user,
        `${user.name} signed in successfully.`
      );
      const savedState = await writeState(loggedState);
      const savedUser = savedState.users.find((entry) => entry.id === user.id);
      const token = createSession(savedUser.id);

      sendJson(response, 200, {
        ok: true,
        message: 'Login successful.',
        token,
        user: sanitizeUser(savedUser),
        appSettings: sanitizeAppSettingsForClient(savedState.appSettings)
      });
    } catch (error) {
      console.error('Failed to process login request.', error);
      sendJson(response, 400, {
        ok: false,
        message: 'Invalid login request.'
      });
    }
    return;
  }

  if (pathname === '/api/auth/signup' && request.method === 'POST') {
    try {
      const body = await readRequestBody(request);
      const state = await readState();
      if (!isInitialSignupAllowed(state)) {
        sendJson(response, 403, {
          ok: false,
          message: 'Initial signup is no longer available. Login and manage access from Settings instead.'
        });
        return;
      }

      const primaryAdmin = findPrimaryAdmin(state) || createLegacyAdminUser(state.appSettings);
      const usernameValidation = validateUsernameValue(body.username, state.users, primaryAdmin && primaryAdmin.id);
      if (!usernameValidation.ok) {
        sendJson(response, 400, { ok: false, message: usernameValidation.message });
        return;
      }
      const username = usernameValidation.username;
      const password = String(body.password || '');
      const name = String(body.name || username || 'Administrator').trim() || 'Administrator';
      const email = normalizeEmail(body.email);
      const phone = normalizePhone(body.phone);
      if (!isValidEmail(email)) {
        sendJson(response, 400, { ok: false, message: 'Enter a valid email address or leave it empty.' });
        return;
      }
      if (!isValidPhone(phone)) {
        sendJson(response, 400, { ok: false, message: 'Enter a valid phone number or leave it empty.' });
        return;
      }
      if (password.length < 4) {
        sendJson(response, 400, { ok: false, message: 'Password must be at least 4 characters.' });
        return;
      }
      if (findUserByEmail(state.users, email, primaryAdmin.id)) {
        sendJson(response, 400, { ok: false, message: 'That email is already linked to another account.' });
        return;
      }
      const updatedAdmin = normalizeUser({
        ...primaryAdmin,
        name,
        username,
        email,
        phone,
        passwordHash: hashPassword(password),
        role: 'Admin',
        active: true,
        updatedAt: nowIso()
      });

      const users = state.users.map((entry) => (
        entry.id === primaryAdmin.id ? updatedAdmin : entry
      ));
      const nextState = appendAuditLog({
        ...state,
        users,
        appSettings: {
          ...state.appSettings,
          adminUsername: username,
          adminPassword: password
        }
      }, 'Initial Setup', updatedAdmin, `${updatedAdmin.name} completed initial admin setup.`);
      const savedState = await writeState(nextState);
      const token = createSession(updatedAdmin.id);

      sendJson(response, 200, {
        ok: true,
        message: 'Admin access created successfully.',
        token,
        user: sanitizeUser(savedState.users.find((entry) => entry.id === updatedAdmin.id)),
        appSettings: sanitizeAppSettingsForClient(savedState.appSettings)
      });
    } catch (error) {
      console.error('Failed to process signup request.', error);
      sendJson(response, 400, {
        ok: false,
        message: error.message || 'Invalid signup request.'
      });
    }
    return;
  }

  if (pathname === '/api/auth/register' && request.method === 'POST') {
    try {
      const body = await readRequestBody(request);
      const state = await readState();
      const usernameValidation = validateUsernameValue(body.username, state.users);
      if (!usernameValidation.ok) {
        sendJson(response, 400, { ok: false, message: usernameValidation.message });
        return;
      }
      const username = usernameValidation.username;
      const password = String(body.password || '');
      const name = String(body.name || username || 'Church User').trim() || 'Church User';
      const email = normalizeEmail(body.email);
      const phone = normalizePhone(body.phone);
      const role = normalizeSelfSignupRole(body.role);
      if (!isValidEmail(email)) {
        sendJson(response, 400, { ok: false, message: 'Enter a valid email address or leave it empty.' });
        return;
      }
      if (!isValidPhone(phone)) {
        sendJson(response, 400, { ok: false, message: 'Enter a valid phone number or leave it empty.' });
        return;
      }
      if (password.length < 4) {
        sendJson(response, 400, { ok: false, message: 'Password must be at least 4 characters.' });
        return;
      }
      if (findUserByEmail(state.users, email)) {
        sendJson(response, 400, { ok: false, message: 'That email is already linked to another account.' });
        return;
      }

      const user = normalizeUser({
        id: createId('usr'),
        name,
        username,
        email,
        phone,
        passwordHash: hashPassword(password),
        role,
        active: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastLoginAt: nowIso()
      });
      let nextState = {
        ...state,
        users: normalizeUsers([...state.users, user], state.appSettings)
      };
      nextState = appendAuditLog(
        nextState,
        'Self Signup',
        user,
        `${user.name} created a ${user.role} account from the login screen.`
      );
      const savedState = await writeState(nextState);
      const savedUser = savedState.users.find((entry) => entry.id === user.id);
      const token = createSession(savedUser.id);

      sendJson(response, 200, {
        ok: true,
        message: 'Account created successfully.',
        token,
        user: sanitizeUser(savedUser),
        appSettings: sanitizeAppSettingsForClient(savedState.appSettings)
      });
    } catch (error) {
      console.error('Failed to process register request.', error);
      sendJson(response, 400, {
        ok: false,
        message: error.message || 'Unable to create account.'
      });
    }
    return;
  }

  if (pathname === '/api/auth/session' && request.method === 'GET') {
    const state = await readState();
    const auth = requireAuth(request, response, state);
    if (!auth) return;
    sendJson(response, 200, {
      ok: true,
      user: sanitizeUser(auth.user),
      appSettings: sanitizeAppSettingsForClient(state.appSettings)
    });
    return;
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    destroySession(getTokenFromRequest(request));
    sendJson(response, 200, {
      ok: true,
      message: 'Logged out successfully.'
    });
    return;
  }

  if (pathname === '/api/auth/account' && request.method === 'PUT') {
    try {
      const state = await readState();
      const auth = requireAuth(request, response, state);
      if (!auth) return;
      const body = await readRequestBody(request);
      const currentPassword = String(body.currentPassword || '');
      if (!verifyPassword(currentPassword, auth.user.passwordHash)) {
        sendJson(response, 400, {
          ok: false,
          message: 'Current password is incorrect.'
        });
        return;
      }

      const usernameValidation = validateUsernameValue(body.username || auth.user.username, state.users, auth.user.id);
      if (!usernameValidation.ok) {
        sendJson(response, 400, { ok: false, message: usernameValidation.message });
        return;
      }
      const username = usernameValidation.username;
      const name = String(body.name || auth.user.name || username).trim() || auth.user.name;
      const email = normalizeEmail(Object.prototype.hasOwnProperty.call(body, 'email') ? body.email : auth.user.email);
      const phone = normalizePhone(Object.prototype.hasOwnProperty.call(body, 'phone') ? body.phone : auth.user.phone);
      const newPassword = String(body.newPassword || '');
      if (!isValidEmail(email)) {
        sendJson(response, 400, { ok: false, message: 'Enter a valid email address or leave it empty.' });
        return;
      }
      if (!isValidPhone(phone)) {
        sendJson(response, 400, { ok: false, message: 'Enter a valid phone number or leave it empty.' });
        return;
      }
      if (newPassword && newPassword.length < 4) {
        sendJson(response, 400, { ok: false, message: 'New password must be at least 4 characters.' });
        return;
      }
      if (findUserByEmail(state.users, email, auth.user.id)) {
        sendJson(response, 400, { ok: false, message: 'That email is already linked to another account.' });
        return;
      }

      const updatedUser = normalizeUser({
        ...auth.user,
        username,
        name,
        email,
        phone,
        passwordHash: newPassword ? hashPassword(newPassword) : auth.user.passwordHash,
        updatedAt: nowIso()
      });
      let nextState = {
        ...state,
        users: state.users.map((entry) => (
          entry.id === auth.user.id ? updatedUser : entry
        ))
      };

      const primaryAdmin = findPrimaryAdmin(state);
      if (primaryAdmin && primaryAdmin.id === auth.user.id) {
        nextState = {
          ...nextState,
          appSettings: {
            ...nextState.appSettings,
            adminUsername: updatedUser.username,
            adminPassword: newPassword || nextState.appSettings.adminPassword
          }
        };
      }

      nextState = appendAuditLog(
        nextState,
        'Account Update',
        updatedUser,
        `${updatedUser.name} updated their account details.`
      );
      const savedState = await writeState(nextState);

      sendJson(response, 200, {
        ok: true,
        message: 'Account updated successfully.',
        user: sanitizeUser(savedState.users.find((entry) => entry.id === auth.user.id)),
        appSettings: sanitizeAppSettingsForClient(savedState.appSettings)
      });
    } catch (error) {
      console.error('Failed to update account.', error);
      sendJson(response, 400, {
        ok: false,
        message: error.message || 'Unable to update account.'
      });
    }
    return;
  }

  if (pathname === '/api/users' && request.method === 'GET') {
    const state = await readState();
    const auth = requireAdmin(request, response, state);
    if (!auth) return;
    sendJson(response, 200, {
      ok: true,
      users: state.users.map(sanitizeUser),
      roles: ROLE_OPTIONS
    });
    return;
  }

  if (pathname === '/api/users' && request.method === 'POST') {
    try {
      const state = await readState();
      const auth = requireAdmin(request, response, state);
      if (!auth) return;
      const body = await readRequestBody(request);
      const validation = validateNewUserPayload(body, state.users);
      if (!validation.ok) {
        sendJson(response, 400, { ok: false, message: validation.message });
        return;
      }

      const user = normalizeUser({
        id: createId('usr'),
        name: validation.value.name,
        username: validation.value.username,
        email: validation.value.email,
        phone: validation.value.phone,
        passwordHash: hashPassword(validation.value.password),
        role: validation.value.role,
        active: validation.value.active,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastLoginAt: ''
      });
      let nextState = {
        ...state,
        users: normalizeUsers([...state.users, user], state.appSettings)
      };
      nextState = appendAuditLog(
        nextState,
        'User Created',
        auth.user,
        `${user.name} (${user.role}) was added to team access.`
      );
      const savedState = await writeState(nextState);
      sendJson(response, 200, {
        ok: true,
        message: 'User created successfully.',
        users: savedState.users.map(sanitizeUser)
      });
    } catch (error) {
      console.error('Failed to create user.', error);
      sendJson(response, 400, {
        ok: false,
        message: error.message || 'Unable to create user.'
      });
    }
    return;
  }

  if (pathname.startsWith('/api/users/') && request.method === 'PUT') {
    try {
      const userId = pathname.slice('/api/users/'.length);
      const state = await readState();
      const auth = requireAdmin(request, response, state);
      if (!auth) return;
      const target = state.users.find((entry) => entry.id === userId);
      if (!target) {
        sendJson(response, 404, { ok: false, message: 'User not found.' });
        return;
      }

      const body = await readRequestBody(request);
      const validation = validateNewUserPayload(body, state.users, target.id);
      if (!validation.ok) {
        sendJson(response, 400, { ok: false, message: validation.message });
        return;
      }

      const nextRole = validation.value.role;
      const nextActive = validation.value.active;
      const activeAdminCount = state.users.filter((entry) => entry.role === 'Admin' && entry.active).length;
      const removingAdminAccess = target.role === 'Admin' && target.active && (nextRole !== 'Admin' || !nextActive);
      if (removingAdminAccess && activeAdminCount <= 1) {
        sendJson(response, 400, {
          ok: false,
          message: 'At least one active admin must remain.'
        });
        return;
      }
      if (target.id === auth.user.id && !nextActive) {
        sendJson(response, 400, {
          ok: false,
          message: 'You cannot deactivate your own active session.'
        });
        return;
      }

      const updatedUser = normalizeUser({
        ...target,
        name: validation.value.name,
        username: validation.value.username,
        email: validation.value.email,
        phone: validation.value.phone,
        role: nextRole,
        active: nextActive,
        passwordHash: validation.value.password ? hashPassword(validation.value.password) : target.passwordHash,
        updatedAt: nowIso()
      });

      let nextState = {
        ...state,
        users: normalizeUsers(
          state.users.map((entry) => (entry.id === target.id ? updatedUser : entry)),
          state.appSettings
        )
      };

      const primaryAdmin = findPrimaryAdmin(state);
      if (primaryAdmin && primaryAdmin.id === target.id) {
        nextState = {
          ...nextState,
          appSettings: {
            ...nextState.appSettings,
            adminUsername: updatedUser.username,
            adminPassword: validation.value.password || nextState.appSettings.adminPassword
          }
        };
      }

      nextState = appendAuditLog(
        nextState,
        'User Updated',
        auth.user,
        `${updatedUser.name} was updated (${updatedUser.role}${updatedUser.active ? '' : ', inactive'}).`
      );
      const savedState = await writeState(nextState);
      sendJson(response, 200, {
        ok: true,
        message: 'User updated successfully.',
        users: savedState.users.map(sanitizeUser),
        appSettings: sanitizeAppSettingsForClient(savedState.appSettings)
      });
    } catch (error) {
      console.error('Failed to update user.', error);
      sendJson(response, 400, {
        ok: false,
        message: error.message || 'Unable to update user.'
      });
    }
    return;
  }

  if (pathname.startsWith('/api/users/') && request.method === 'DELETE') {
    try {
      const userId = pathname.slice('/api/users/'.length);
      const state = await readState();
      const auth = requireAdmin(request, response, state);
      if (!auth) return;
      const target = state.users.find((entry) => entry.id === userId);
      if (!target) {
        sendJson(response, 404, { ok: false, message: 'User not found.' });
        return;
      }
      if (target.id === auth.user.id) {
        sendJson(response, 400, {
          ok: false,
          message: 'You cannot delete the account you are currently using.'
        });
        return;
      }
      const activeAdminCount = state.users.filter((entry) => entry.role === 'Admin' && entry.active).length;
      if (target.role === 'Admin' && target.active && activeAdminCount <= 1) {
        sendJson(response, 400, {
          ok: false,
          message: 'At least one active admin must remain.'
        });
        return;
      }

      let nextState = {
        ...state,
        users: state.users.filter((entry) => entry.id !== target.id)
      };
      nextState = appendAuditLog(
        nextState,
        'User Deleted',
        auth.user,
        `${target.name} (${target.role}) was removed from team access.`
      );
      const savedState = await writeState(nextState);
      sendJson(response, 200, {
        ok: true,
        message: 'User deleted successfully.',
        users: savedState.users.map(sanitizeUser)
      });
    } catch (error) {
      console.error('Failed to delete user.', error);
      sendJson(response, 400, {
        ok: false,
        message: error.message || 'Unable to delete user.'
      });
    }
    return;
  }

  if (pathname === '/api/audit-logs' && request.method === 'GET') {
    const state = await readState();
    const auth = requireAdmin(request, response, state);
    if (!auth) return;
    sendJson(response, 200, {
      ok: true,
      logs: normalizeAuditLogs(state.auditLogs)
    });
    return;
  }

  sendJson(response, 404, {
    ok: false,
    message: 'API route not found.'
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${HOST}:${PORT}`}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/api/')) {
      await handleApi(request, response, pathname);
      return;
    }

    await serveStaticFile(response, pathname);
  } catch (error) {
    console.error('Unhandled server error.', error);
    sendJson(response, 500, {
      ok: false,
      message: 'Internal server error.'
    });
  }
});

let shuttingDown = false;
function shutdownServer(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down COG server...`);
  const forceShutdownTimer = setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
  forceShutdownTimer.unref();

  server.close(() => {
    if (sqliteDb) {
      try {
        sqliteDb.close();
      } catch (error) {
        console.error('Failed to close SQLite cleanly.', error);
      }
    }
    clearTimeout(forceShutdownTimer);
    console.log('COG server stopped.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));

ensureStateStore()
  .then(async () => {
    const normalizedState = await readState();
    await writeState(normalizedState);
    server.listen(PORT, HOST, () => {
      console.log(`COG full-stack server running at http://${HOST}:${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Storage: ${getStorageDescriptor()}`);
      console.log(`JSON state file: ${JSON_STATE_FILE}`);
      if (PUBLIC_BASE_URL) {
        console.log(`Public URL: ${PUBLIC_BASE_URL}`);
      }
    });
  })
  .catch((error) => {
    console.error('Failed to start server.', error);
    process.exitCode = 1;
  });
