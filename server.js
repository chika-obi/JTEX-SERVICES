import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

const CONFIG_PATH = path.join(__dirname, 'site-config.json');
const AUDIT_LOG_PATH = path.join(__dirname, 'audit-logs.json');
const UPLOADS_DIR = path.join(__dirname, 'images', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure audit log exists with baseline seed if not present
if (!fs.existsSync(AUDIT_LOG_PATH)) {
  const seedLogs = [
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
  try {
    fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(seedLogs, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing initial audit logs:', err);
  }
}

function readAuditLogs() {
  try {
    if (fs.existsSync(AUDIT_LOG_PATH)) {
      const data = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading audit logs:', err);
  }
  return [];
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
    fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(trimmed, null, 2), 'utf8');
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
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      return {
        receiptPin: parsed.receiptPin || DEFAULT_CONFIG.receiptPin,
        adminPin: parsed.adminPin || DEFAULT_CONFIG.adminPin,
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
    }
  } catch (err) {
    console.error('Error reading site config:', err);
  }
  return { ...DEFAULT_CONFIG };
}

function writeConfig(cfg) {
  try {
    cfg.updatedAt = new Date().toISOString();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing site config:', err);
    return false;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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

// Verify Receipt PIN endpoint (for client Receipt Database access)
app.post('/api/verify-receipt-pin', (req, res) => {
  const { pin } = req.body || {};
  const cfg = readConfig();
  if (pin && String(pin).trim() === String(cfg.receiptPin).trim()) {
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

// Verify Admin PIN endpoint (for Admin Console entrance)
app.post('/api/verify-admin-pin', (req, res) => {
  const { pin } = req.body || {};
  const cfg = readConfig();
  if (pin && String(pin).trim() === String(cfg.adminPin).trim()) {
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

app.post('/api/admin/clear-audit-logs', (req, res) => {
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
    fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(clearedRecord, null, 2), 'utf8');
    res.json({ success: true, message: 'Audit logs cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear logs.' });
  }
});

// Record Auto-Lock Event due to inactivity
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
app.post('/api/admin/update-receipt-pin', (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const cfg = readConfig();

  if (String(currentPin).trim() !== String(cfg.receiptPin).trim()) {
    return res.status(401).json({ success: false, error: 'Current Receipt PIN is incorrect.' });
  }

  const cleanNewPin = String(newPin || '').trim();
  if (!/^\d{4}$/.test(cleanNewPin)) {
    return res.status(400).json({ success: false, error: 'New Receipt PIN must be exactly 4 numeric digits.' });
  }

  cfg.receiptPin = cleanNewPin;
  if (writeConfig(cfg)) {
    addAuditLog({
      portal: 'Receipt Portal',
      action: 'PIN Change',
      status: 'SYSTEM',
      message: 'Receipt access PIN updated by Administrator',
      req
    });
    return res.json({ success: true, message: 'Receipt PIN updated successfully.' });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to save configuration.' });
  }
});

// Admin Reset Receipt PIN
app.post('/api/admin/reset-receipt-pin', (req, res) => {
  const cfg = readConfig();
  cfg.receiptPin = DEFAULT_CONFIG.receiptPin;
  if (writeConfig(cfg)) {
    addAuditLog({
      portal: 'Receipt Portal',
      action: 'Factory Reset',
      status: 'SYSTEM',
      message: 'Receipt PIN reset to factory default',
      req
    });
    return res.json({ success: true, message: 'Receipt PIN reset to default successfully.' });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to reset PIN.' });
  }
});

// Admin Update Admin PIN
app.post('/api/admin/update-admin-pin', (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const cfg = readConfig();

  if (String(currentPin).trim() !== String(cfg.adminPin).trim()) {
    return res.status(401).json({ success: false, error: 'Current Admin PIN is incorrect.' });
  }

  const cleanNewPin = String(newPin || '').trim();
  if (!/^\d{4}$/.test(cleanNewPin)) {
    return res.status(400).json({ success: false, error: 'New Admin PIN must be exactly 4 numeric digits.' });
  }

  cfg.adminPin = cleanNewPin;
  if (writeConfig(cfg)) {
    addAuditLog({
      portal: 'Admin Console',
      action: 'PIN Change',
      status: 'SYSTEM',
      message: 'Master Admin PIN updated by Administrator',
      req
    });
    return res.json({ success: true, message: 'Admin PIN updated successfully.' });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to save configuration.' });
  }
});

// Admin Reset Admin PIN
app.post('/api/admin/reset-admin-pin', (req, res) => {
  const cfg = readConfig();
  cfg.adminPin = DEFAULT_CONFIG.adminPin;
  if (writeConfig(cfg)) {
    addAuditLog({
      portal: 'Admin Console',
      action: 'Factory Reset',
      status: 'SYSTEM',
      message: 'Admin PIN reset to factory default',
      req
    });
    return res.json({ success: true, message: 'Admin PIN reset to default successfully.' });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to reset Admin PIN.' });
  }
});

// Backward-compatibility aliases
app.post('/api/admin/update-pin', (req, res) => {
  const { currentPin, newPin } = req.body || {};
  const cfg = readConfig();
  if (String(currentPin).trim() !== String(cfg.receiptPin).trim()) {
    return res.status(401).json({ success: false, error: 'Current PIN is incorrect.' });
  }
  const cleanNewPin = String(newPin || '').trim();
  if (!/^\d{4}$/.test(cleanNewPin)) {
    return res.status(400).json({ success: false, error: 'New PIN must be exactly 4 numeric digits.' });
  }
  cfg.receiptPin = cleanNewPin;
  if (writeConfig(cfg)) {
    return res.json({ success: true, message: 'PIN updated successfully.' });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to save configuration.' });
  }
});

app.post('/api/admin/reset-pin', (req, res) => {
  const cfg = readConfig();
  cfg.receiptPin = DEFAULT_CONFIG.receiptPin;
  if (writeConfig(cfg)) {
    return res.json({ success: true, message: 'PIN reset to default successfully.' });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to reset PIN.' });
  }
});

// Admin Update Image (supports base64 dataUrl or external URL)
app.post('/api/admin/update-image', (req, res) => {
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
      let buffer;

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(dataUrl, 'base64');
      }

      const filename = `${key}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `images/uploads/${filename}?v=${Date.now()}`;
      cfg.images[key] = publicUrl;
      writeConfig(cfg);

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
    writeConfig(cfg);
    return res.json({ success: true, key, url: cleanUrl });
  } else {
    return res.status(400).json({ success: false, error: 'No image data or URL provided.' });
  }
});

// Admin Reset Image back to system default
app.post('/api/admin/reset-image', (req, res) => {
  const { key } = req.body || {};
  const validKeys = ['hero', 'md', 'gm', 'it', 'procurement'];

  if (!validKeys.includes(key)) {
    return res.status(400).json({ success: false, error: `Invalid image target: ${key}` });
  }

  const cfg = readConfig();
  cfg.images[key] = DEFAULT_CONFIG.images[key];
  writeConfig(cfg);

  return res.json({ success: true, key, url: DEFAULT_CONFIG.images[key] });
});

// Admin Update Services Visibility (Operational Status)
app.post('/api/admin/update-services-visibility', (req, res) => {
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

  if (writeConfig(cfg)) {
    const activeCount = Object.values(updated).filter(Boolean).length;
    const pausedCount = validKeys.length - activeCount;

    addAuditLog({
      portal: 'Admin Console',
      action: 'Operational Status',
      status: 'SUCCESS',
      message: `Updated service operational visibility: ${activeCount} active, ${pausedCount} hidden`,
      req
    });

    return res.json({
      success: true,
      servicesVisibility: cfg.servicesVisibility,
      message: 'Operational status updated successfully.'
    });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to update services operational visibility.' });
  }
});

// Admin Reset Services Visibility to Default (All Active)
app.post('/api/admin/reset-services-visibility', (req, res) => {
  const cfg = readConfig();
  cfg.servicesVisibility = { ...DEFAULT_SERVICES_VISIBILITY };

  if (writeConfig(cfg)) {
    addAuditLog({
      portal: 'Admin Console',
      action: 'Operational Status',
      status: 'SYSTEM',
      message: 'Reset all service divisions operational visibility to default (all active)',
      req
    });

    return res.json({
      success: true,
      servicesVisibility: cfg.servicesVisibility,
      message: 'All services operational visibility reset to active default.'
    });
  } else {
    return res.status(500).json({ success: false, error: 'Failed to reset services operational visibility.' });
  }
});

// Serve static assets with proper MIME types
app.use(express.static(__dirname));

// Fallback to index.html for any unhandled routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
