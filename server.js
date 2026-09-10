import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getGitHubConfig,
  hashPin,
  verifyPin,
  commitFilesToGitHub,
  cacheUploadedImage,
  getCachedUploadedImage,
  fetchRawFromGitHub
} from './github-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

const CONFIG_PATH = path.join(__dirname, 'site-config.json');
const AUDIT_LOG_PATH = path.join(__dirname, 'audit-logs.json');
const UPLOADS_DIR = path.join(__dirname, 'images', 'uploads');

// Ensure local uploads directory exists
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem in some serverless environments is expected
}

// In-memory caches to ensure fast responses and serverless resilience
let cachedConfig = null;
let cachedAuditLogs = null;

// Baseline audit logs seed if not present
const SEED_LOGS = [
  {
    id: 'log_seed_01',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    portal: 'Receipt Portal',
    action: 'Login Attempt',
    status: 'SUCCESS',
    message: 'Client unlocked Receipt Database with valid PIN',
    ip: '127.0.0.1',
    userAgent: 'Desktop Browser (Chrome / Windows)'
  },
  {
    id: 'log_seed_02',
    timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    portal: 'Receipt Portal',
    action: 'Login Attempt',
    status: 'FAILED',
    message: 'Invalid 4-digit PIN entered (attempt rejected)',
    ip: '102.89.41.22',
    userAgent: 'Mobile Client (Safari / iOS)'
  },
  {
    id: 'log_seed_03',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    portal: 'Admin Console',
    action: 'Login Attempt',
    status: 'SUCCESS',
    message: 'Administrator authenticated into console',
    ip: '127.0.0.1',
    userAgent: 'Desktop Browser (Chrome / Windows)'
  }
];

function readAuditLogs() {
  if (cachedAuditLogs && Array.isArray(cachedAuditLogs)) {
    return cachedAuditLogs;
  }
  try {
    if (fs.existsSync(AUDIT_LOG_PATH)) {
      const data = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        cachedAuditLogs = parsed;
        return cachedAuditLogs;
      }
    }
  } catch (err) {
    console.error('Error reading audit logs:', err);
  }
  cachedAuditLogs = [...SEED_LOGS];
  return cachedAuditLogs;
}

function writeAuditLogs(logs) {
  cachedAuditLogs = logs;
  try {
    fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    // Read-only filesystem catch
  }
}

function addAuditLog({ portal, action, status, message, req }) {
  try {
    const logs = readAuditLogs();
    const forwarded = req ? req.headers['x-forwarded-for'] : '';
    let clientIp = forwarded ? forwarded.split(',')[0].trim() : (req?.socket?.remoteAddress || '127.0.0.1');
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') clientIp = '127.0.0.1';

    const rawAgent = req ? (req.headers['user-agent'] || 'Direct Client') : 'Direct Client';
    let formattedAgent = rawAgent;
    if (rawAgent.includes('Mobile') || rawAgent.includes('Android') || rawAgent.includes('iPhone')) {
      formattedAgent = 'Mobile Client (' + (rawAgent.includes('iPhone') ? 'iOS' : 'Android') + ')';
    } else if (rawAgent.includes('Windows') || rawAgent.includes('Macintosh') || rawAgent.includes('Linux')) {
      formattedAgent = 'Desktop Workstation';
    }
    if (formattedAgent.length > 50) formattedAgent = formattedAgent.substring(0, 50);

    const entry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      portal: portal || 'System',
      action: action || 'Event',
      status: status || 'NOTICE',
      message: message || '',
      ip: clientIp,
      userAgent: formattedAgent
    };

    logs.unshift(entry);
    const trimmed = logs.slice(0, 150);
    writeAuditLogs(trimmed);
    return entry;
  } catch (err) {
    console.error('Error recording audit log:', err);
  }
}

const DEFAULT_SERVICES_VISIBILITY = {
  'drilling-chemicals': true,
  'procurement': true,
  'environmental': true,
  'logistics': true,
  'security': true,
  'contracts': true
};

const DEFAULT_CONFIG = {
  receiptPin: '1965',
  adminPin: '1965',
  images: {
    hero: 'images/md.jpeg',
    md: 'images/MDCEO.jpeg',
    gm: 'images/IMG-20260907-WA0014.jpg',
    it: 'images/IT2.jpeg',
    procurement: 'images/PROCUREMENT.jpeg'
  },
  servicesVisibility: {
    ...DEFAULT_SERVICES_VISIBILITY
  },
  updatedAt: new Date().toISOString()
};

function readConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      cachedConfig = {
        receiptPin: parsed.receiptPin,
        receiptPinHash: parsed.receiptPinHash,
        adminPin: parsed.adminPin,
        adminPinHash: parsed.adminPinHash,
        images: {
          ...DEFAULT_CONFIG.images,
          ...(parsed.images || {})
        },
        servicesVisibility: {
          ...DEFAULT_SERVICES_VISIBILITY,
          ...(parsed.servicesVisibility || {})
        },
        updatedAt: parsed.updatedAt || new Date().toISOString()
      };
      return cachedConfig;
    }
  } catch (err) {
    console.error('Error reading site config:', err);
  }
  cachedConfig = { ...DEFAULT_CONFIG };
  return cachedConfig;
}

function writeConfigLocally(cfg) {
  cachedConfig = cfg;
  try {
    cfg.updatedAt = new Date().toISOString();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    // Expected on serverless read-only filesystems
    return true;
  }
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check endpoint
app.get('/api/health', (req, res) => {
  const gh = getGitHubConfig();
  res.json({
    status: 'ok',
    storage: gh.isConfigured ? 'github-backed' : 'local-filesystem',
    repo: gh.isConfigured ? `${gh.owner}/${gh.repo} (${gh.branch})` : 'none'
  });
});

// Dynamic route to serve uploaded leadership images
// Falls back from: Memory Cache -> Local Filesystem -> GitHub Raw Content
app.get('/images/uploads/:filename', async (req, res, next) => {
  const { filename } = req.params;
  const cleanFilename = path.basename(filename);

  // 1. In-memory cache
  const cached = getCachedUploadedImage(cleanFilename);
  if (cached) {
    res.setHeader('Content-Type', cached.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.send(cached.buffer);
  }

  // 2. Local filesystem
  const localFilePath = path.join(UPLOADS_DIR, cleanFilename);
  if (fs.existsSync(localFilePath)) {
    return res.sendFile(localFilePath);
  }

  // 3. GitHub repository raw file fallback
  try {
    const rawBuffer = await fetchRawFromGitHub(`images/uploads/${cleanFilename}`);
    if (rawBuffer) {
      let mime = 'image/jpeg';
      if (cleanFilename.endsWith('.png')) mime = 'image/png';
      else if (cleanFilename.endsWith('.webp')) mime = 'image/webp';

      cacheUploadedImage(cleanFilename, rawBuffer, mime);
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      return res.send(rawBuffer);
    }
  } catch (e) {
    // Continue to 404
  }

  res.status(404).send('Image not found');
});

// Public config: returns image URLs, operational status, and timestamp without revealing PINs
app.get('/api/site-config', (req, res) => {
  const cfg = readConfig();
  res.json({
    success: true,
    images: cfg.images,
    servicesVisibility: cfg.servicesVisibility,
    updatedAt: cfg.updatedAt
  });
});

// Verify Receipt PIN endpoint
app.post('/api/verify-receipt-pin', (req, res) => {
  const { pin } = req.body || {};
  const cfg = readConfig();

  const isValid = verifyPin({
    enteredPin: pin,
    storedHash: cfg.receiptPinHash,
    storedPlain: cfg.receiptPin,
    envOverride: process.env.RECEIPT_PIN,
    defaultPin: '1965'
  });

  if (isValid) {
    addAuditLog({
      portal: 'Receipt Portal',
      action: 'Login Attempt',
      status: 'SUCCESS',
      message: 'Authorized access to Receipt Database granted',
      req
    });
    return res.json({ valid: true });
  }

  addAuditLog({
    portal: 'Receipt Portal',
    action: 'Login Attempt',
    status: 'FAILED',
    message: 'Incorrect 4-digit Receipt PIN entered',
    req
  });
  return res.status(401).json({ valid: false, error: 'Incorrect 4-digit PIN' });
});

// Verify Admin PIN endpoint
app.post('/api/verify-admin-pin', (req, res) => {
  const { pin } = req.body || {};
  const cfg = readConfig();

  const isValid = verifyPin({
    enteredPin: pin,
    storedHash: cfg.adminPinHash,
    storedPlain: cfg.adminPin,
    envOverride: process.env.ADMIN_PIN,
    defaultPin: '1965'
  });

  if (isValid) {
    addAuditLog({
      portal: 'Admin Console',
      action: 'Login Attempt',
      status: 'SUCCESS',
      message: 'Administrator session unlocked successfully',
      req
    });
    return res.json({ valid: true });
  }

  addAuditLog({
    portal: 'Admin Console',
    action: 'Login Attempt',
    status: 'FAILED',
    message: 'Unauthorized attempt to unlock Admin Console',
    req
  });
  return res.status(401).json({ valid: false, error: 'Incorrect 4-digit Admin PIN' });
});

// Security Audit Log Endpoints
app.get('/api/admin/audit-logs', (req, res) => {
  const logs = readAuditLogs();
  res.json({ success: true, logs });
});

app.post('/api/admin/clear-audit-logs', async (req, res) => {
  try {
    const clearedRecord = [
      {
        id: 'log_cleared_' + Date.now(),
        timestamp: new Date().toISOString(),
        portal: 'Admin Console',
        action: 'Log Maintenance',
        status: 'SYSTEM',
        message: 'Security audit logs were cleared by an authorized administrator',
        ip: '127.0.0.1',
        userAgent: 'Admin Action'
      }
    ];
    writeAuditLogs(clearedRecord);

    // Commit to GitHub if configured
    await commitFilesToGitHub({
      files: [{ path: 'audit-logs.json', content: clearedRecord }],
      message: 'Admin maintenance: cleared audit logs'
    });

    res.json({ success: true, message: 'Audit logs cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear logs.' });
  }
});

// Record Auto-Lock Event
app.post('/api/admin/auto-lock-log', (req, res) => {
  addAuditLog({
    portal: 'Admin Console',
    action: 'Session Timeout',
    status: 'SYSTEM',
    message: 'Admin Console auto-locked due to 5 minutes of inactivity',
    req
  });
  res.json({ success: true });
});

// Admin Update Receipt PIN
app.post('/api/admin/update-receipt-pin', async (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const cfg = readConfig();

  const isCurrentValid = verifyPin({
    enteredPin: currentPin,
    storedHash: cfg.receiptPinHash,
    storedPlain: cfg.receiptPin,
    envOverride: process.env.RECEIPT_PIN,
    defaultPin: '1965'
  });

  if (!isCurrentValid) {
    return res.status(401).json({ success: false, error: 'Current Receipt PIN is incorrect.' });
  }

  const cleanNewPin = String(newPin || '').trim();
  if (!/^\d{4}$/.test(cleanNewPin)) {
    return res.status(400).json({ success: false, error: 'New Receipt PIN must be exactly 4 numeric digits.' });
  }

  const { salt } = getGitHubConfig();
  cfg.receiptPinHash = hashPin(cleanNewPin, salt);
  delete cfg.receiptPin; // Prevent storing plaintext PIN in public repository

  writeConfigLocally(cfg);

  const logEntry = addAuditLog({
    portal: 'Receipt Portal',
    action: 'PIN Change',
    status: 'SYSTEM',
    message: 'Receipt access PIN updated by Administrator',
    req
  });

  // Commit updated config and audit logs atomically to GitHub
  await commitFilesToGitHub({
    files: [
      { path: 'site-config.json', content: cfg },
      { path: 'audit-logs.json', content: readAuditLogs() }
    ],
    message: 'Admin update: changed Receipt Portal PIN and updated audit logs'
  });

  return res.json({ success: true, message: 'Receipt PIN updated successfully.' });
});

// Admin Reset Receipt PIN
app.post('/api/admin/reset-receipt-pin', async (req, res) => {
  const cfg = readConfig();
  const { salt } = getGitHubConfig();

  cfg.receiptPinHash = hashPin('1965', salt);
  delete cfg.receiptPin;

  writeConfigLocally(cfg);

  addAuditLog({
    portal: 'Receipt Portal',
    action: 'Factory Reset',
    status: 'SYSTEM',
    message: 'Receipt PIN reset to factory default (1965)',
    req
  });

  await commitFilesToGitHub({
    files: [
      { path: 'site-config.json', content: cfg },
      { path: 'audit-logs.json', content: readAuditLogs() }
    ],
    message: 'Admin update: reset Receipt Portal PIN to factory default'
  });

  return res.json({ success: true, message: 'Receipt PIN reset to default successfully.' });
});

// Admin Update Admin PIN
app.post('/api/admin/update-admin-pin', async (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const cfg = readConfig();

  const isCurrentValid = verifyPin({
    enteredPin: currentPin,
    storedHash: cfg.adminPinHash,
    storedPlain: cfg.adminPin,
    envOverride: process.env.ADMIN_PIN,
    defaultPin: '1965'
  });

  if (!isCurrentValid) {
    return res.status(401).json({ success: false, error: 'Current Admin PIN is incorrect.' });
  }

  const cleanNewPin = String(newPin || '').trim();
  if (!/^\d{4}$/.test(cleanNewPin)) {
    return res.status(400).json({ success: false, error: 'New Admin PIN must be exactly 4 numeric digits.' });
  }

  const { salt } = getGitHubConfig();
  cfg.adminPinHash = hashPin(cleanNewPin, salt);
  delete cfg.adminPin; // Prevent storing plaintext PIN in public repository

  writeConfigLocally(cfg);

  addAuditLog({
    portal: 'Admin Console',
    action: 'PIN Change',
    status: 'SYSTEM',
    message: 'Master Admin PIN updated by Administrator',
    req
  });

  await commitFilesToGitHub({
    files: [
      { path: 'site-config.json', content: cfg },
      { path: 'audit-logs.json', content: readAuditLogs() }
    ],
    message: 'Admin update: changed Master Admin PIN and updated audit logs'
  });

  return res.json({ success: true, message: 'Admin PIN updated successfully.' });
});

// Admin Reset Admin PIN
app.post('/api/admin/reset-admin-pin', async (req, res) => {
  const cfg = readConfig();
  const { salt } = getGitHubConfig();

  cfg.adminPinHash = hashPin('1965', salt);
  delete cfg.adminPin;

  writeConfigLocally(cfg);

  addAuditLog({
    portal: 'Admin Console',
    action: 'Factory Reset',
    status: 'SYSTEM',
    message: 'Admin PIN reset to factory default (1965)',
    req
  });

  await commitFilesToGitHub({
    files: [
      { path: 'site-config.json', content: cfg },
      { path: 'audit-logs.json', content: readAuditLogs() }
    ],
    message: 'Admin update: reset Master Admin PIN to factory default'
  });

  return res.json({ success: true, message: 'Admin PIN reset to default successfully.' });
});

// Backward-compatibility aliases
app.post('/api/admin/update-pin', async (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const cfg = readConfig();

  const isCurrentValid = verifyPin({
    enteredPin: currentPin,
    storedHash: cfg.receiptPinHash,
    storedPlain: cfg.receiptPin,
    envOverride: process.env.RECEIPT_PIN,
    defaultPin: '1965'
  });

  if (!isCurrentValid) {
    return res.status(401).json({ success: false, error: 'Current PIN is incorrect.' });
  }

  const cleanNewPin = String(newPin || '').trim();
  if (!/^\d{4}$/.test(cleanNewPin)) {
    return res.status(400).json({ success: false, error: 'New PIN must be exactly 4 numeric digits.' });
  }

  const { salt } = getGitHubConfig();
  cfg.receiptPinHash = hashPin(cleanNewPin, salt);
  delete cfg.receiptPin;

  writeConfigLocally(cfg);

  await commitFilesToGitHub({
    files: [{ path: 'site-config.json', content: cfg }],
    message: 'Admin update: updated PIN alias'
  });

  return res.json({ success: true, message: 'PIN updated successfully.' });
});

app.post('/api/admin/reset-pin', async (req, res) => {
  const cfg = readConfig();
  const { salt } = getGitHubConfig();

  cfg.receiptPinHash = hashPin('1965', salt);
  delete cfg.receiptPin;

  writeConfigLocally(cfg);

  await commitFilesToGitHub({
    files: [{ path: 'site-config.json', content: cfg }],
    message: 'Admin update: reset PIN alias'
  });

  return res.json({ success: true, message: 'PIN reset to default successfully.' });
});

// Admin Update Image (supports base64 dataUrl or external URL)
// Implements atomic multi-file persistence for image file + site-config.json
app.post('/api/admin/update-image', async (req, res) => {
  const { key, dataUrl, imageUrl } = req.body || {};
  const validKeys = ['hero', 'md', 'gm', 'it', 'procurement'];

  if (!validKeys.includes(key)) {
    return res.status(400).json({ success: false, error: `Invalid image target: ${key}` });
  }

  const cfg = readConfig();

  if (dataUrl && typeof dataUrl === 'string') {
    try {
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let ext = 'jpg';
      let mime = 'image/jpeg';
      let buffer;

      if (matches && matches.length === 3) {
        mime = matches[1];
        if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(dataUrl, 'base64');
      }

      const filename = `${key}.${ext}`;
      const relativePath = `images/uploads/${filename}`;

      // 1. Cache buffer in memory for instant serverless serving
      cacheUploadedImage(filename, buffer, mime);

      // 2. Save locally if filesystem allows
      try {
        const filePath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, buffer);
      } catch (e) {
        // Read-only filesystem is handled by memory cache and GitHub
      }

      // 3. Update public URL in config with cache-busting timestamp
      const publicUrl = `images/uploads/${filename}?v=${Date.now()}`;
      cfg.images[key] = publicUrl;
      writeConfigLocally(cfg);

      addAuditLog({
        portal: 'Admin Console',
        action: 'Image Update',
        status: 'SUCCESS',
        message: `Updated image for ${key.toUpperCase()} section (${filename})`,
        req
      });

      // 4. ATOMIC COMMIT: Commit image file, site-config.json, and audit-logs.json together
      await commitFilesToGitHub({
        files: [
          { path: relativePath, content: buffer, isBinary: true },
          { path: 'site-config.json', content: cfg },
          { path: 'audit-logs.json', content: readAuditLogs() }
        ],
        message: `Admin update: uploaded new image for ${key} and updated site-config.json`
      });

      return res.json({ success: true, key, url: publicUrl });
    } catch (err) {
      console.error('Error saving image upload:', err);
      return res.status(500).json({ success: false, error: 'Failed to process and save image file.' });
    }
  } else if (imageUrl && typeof imageUrl === 'string') {
    const cleanUrl = imageUrl.trim();
    if (!cleanUrl) {
      return res.status(400).json({ success: false, error: 'Image URL is empty.' });
    }
    cfg.images[key] = cleanUrl;
    writeConfigLocally(cfg);

    addAuditLog({
      portal: 'Admin Console',
      action: 'Image Update',
      status: 'SUCCESS',
      message: `Updated image URL for ${key.toUpperCase()} section`,
      req
    });

    await commitFilesToGitHub({
      files: [
        { path: 'site-config.json', content: cfg },
        { path: 'audit-logs.json', content: readAuditLogs() }
      ],
      message: `Admin update: updated image URL for ${key}`
    });

    return res.json({ success: true, key, url: cleanUrl });
  } else {
    return res.status(400).json({ success: false, error: 'No image data or URL provided.' });
  }
});

// Admin Reset Image back to system default
app.post('/api/admin/reset-image', async (req, res) => {
  const { key } = req.body || {};
  const validKeys = ['hero', 'md', 'gm', 'it', 'procurement'];

  if (!validKeys.includes(key)) {
    return res.status(400).json({ success: false, error: `Invalid image target: ${key}` });
  }

  const cfg = readConfig();
  cfg.images[key] = DEFAULT_CONFIG.images[key];
  writeConfigLocally(cfg);

  addAuditLog({
    portal: 'Admin Console',
    action: 'Image Reset',
    status: 'SYSTEM',
    message: `Reset image for ${key.toUpperCase()} back to default`,
    req
  });

  await commitFilesToGitHub({
    files: [
      { path: 'site-config.json', content: cfg },
      { path: 'audit-logs.json', content: readAuditLogs() }
    ],
    message: `Admin update: reset image for ${key} to default`
  });

  return res.json({ success: true, key, url: DEFAULT_CONFIG.images[key] });
});

// Admin Update Services Visibility
app.post('/api/admin/update-services-visibility', async (req, res) => {
  const { servicesVisibility } = req.body || {};
  if (!servicesVisibility || typeof servicesVisibility !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid services visibility payload.' });
  }

  const cfg = readConfig();
  const validKeys = Object.keys(DEFAULT_SERVICES_VISIBILITY);
  const updated = { ...cfg.servicesVisibility };

  validKeys.forEach(key => {
    if (typeof servicesVisibility[key] === 'boolean') {
      updated[key] = servicesVisibility[key];
    }
  });

  cfg.servicesVisibility = updated;
  writeConfigLocally(cfg);

  const activeCount = Object.values(updated).filter(Boolean).length;
  const pausedCount = validKeys.length - activeCount;

  addAuditLog({
    portal: 'Admin Console',
    action: 'Operational Status',
    status: 'SUCCESS',
    message: `Updated service operational visibility: ${activeCount} active, ${pausedCount} hidden`,
    req
  });

  await commitFilesToGitHub({
    files: [
      { path: 'site-config.json', content: cfg },
      { path: 'audit-logs.json', content: readAuditLogs() }
    ],
    message: `Admin update: updated services operational visibility (${activeCount} active, ${pausedCount} hidden)`
  });

  return res.json({
    success: true,
    servicesVisibility: cfg.servicesVisibility,
    message: 'Operational status updated successfully.'
  });
});

// Admin Reset Services Visibility to Default (All Active)
app.post('/api/admin/reset-services-visibility', async (req, res) => {
  const cfg = readConfig();
  cfg.servicesVisibility = { ...DEFAULT_SERVICES_VISIBILITY };
  writeConfigLocally(cfg);

  addAuditLog({
    portal: 'Admin Console',
    action: 'Operational Status',
    status: 'SYSTEM',
    message: 'Reset all service divisions operational visibility to default (all active)',
    req
  });

  await commitFilesToGitHub({
    files: [
      { path: 'site-config.json', content: cfg },
      { path: 'audit-logs.json', content: readAuditLogs() }
    ],
    message: 'Admin update: reset all services operational visibility to default'
  });

  return res.json({
    success: true,
    servicesVisibility: cfg.servicesVisibility,
    message: 'All services operational visibility reset to active default.'
  });
});

// Serve static assets with proper MIME types
app.use(express.static(__dirname));

// Fallback to index.html for any unhandled routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start local dev server if not in Vercel serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

export default app;
