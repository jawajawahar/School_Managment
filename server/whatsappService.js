const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = path.join(__dirname, 'baileys_auth_info');

let sock = null;
let qrCodeDataUrl = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
let connectedUser = null;
let isInitializing = false;

function formatPhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
  // If starts with 0 and length is 10 (e.g. 0752572722 -> 94752572722)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '94' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // If starts with 7 (e.g. 752572722 -> 94752572722)
    cleaned = '94' + cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
}

function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    try {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    } catch (_) {}
  }
}

function clearAuthDir() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const file of files) {
        try {
          fs.rmSync(path.join(AUTH_DIR, file), { recursive: true, force: true });
        } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('Failed to clear auth dir cleanly:', e.message);
  }
  ensureAuthDir();
}

async function initWhatsApp(forceNew = false, phoneNumber = null) {
  if (connectionStatus === 'connected' && sock && !forceNew) {
    return { status: connectionStatus, connectedUser };
  }

  // If forceNew is requested or previous session is disconnected, reset socket & clear stale auth files
  if (forceNew) {
    try {
      if (sock) {
        sock.ev.removeAllListeners();
        sock.end(undefined);
        sock = null;
      }
    } catch (_) {}
    clearAuthDir();
    connectionStatus = 'disconnected';
    qrCodeDataUrl = null;
    connectedUser = null;
  } else if (isInitializing) {
    return { status: connectionStatus, qrCode: qrCodeDataUrl, connectedUser };
  }

  isInitializing = true;
  connectionStatus = 'connecting';

  try {
    ensureAuthDir();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const browserTuple = Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '120.0.0.0'];

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      browser: browserTuple,
      syncFullHistory: false,
      connectTimeoutMs: 25000,
      defaultQueryTimeoutMs: 25000,
    });

    let pairingCode = null;
    if (phoneNumber && !state.creds.registered) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 10) {
        try {
          // Wait slightly for socket connection before requesting pairing code
          setTimeout(async () => {
            try {
              pairingCode = await sock.requestPairingCode(cleanPhone);
              console.log(`🔑 WhatsApp 8-digit Pairing Code generated: ${pairingCode}`);
            } catch (pErr) {
              console.error('Error requesting pairing code:', pErr.message);
            }
          }, 1500);
        } catch (_) {}
      }
    }

    const initPromise = new Promise((resolve) => {
      let resolved = false;

      const finish = (result) => {
        if (!resolved) {
          resolved = true;
          isInitializing = false;
          resolve(result);
        }
      };

      // 12-second safety fallback timeout (allows HTTP requests to receive the live generated QR code)
      const timer = setTimeout(() => {
        finish({ status: connectionStatus, qrCode: qrCodeDataUrl, connectedUser });
      }, 12000);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
            connectionStatus = 'qr_ready';
            console.log('📲 WhatsApp Web QR Code generated and ready for scan!');
            clearTimeout(timer);
            finish({ status: connectionStatus, qrCode: qrCodeDataUrl, connectedUser });
          } catch (qrErr) {
            console.error('Failed to generate QR data URL:', qrErr);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          console.log(`🔌 WhatsApp connection closed. StatusCode: ${statusCode}`);

          if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 408) {
            connectionStatus = 'disconnected';
            connectedUser = null;
            qrCodeDataUrl = null;
            sock = null;
            clearAuthDir();
            clearTimeout(timer);
            finish({ status: connectionStatus, qrCode: null, connectedUser: null });
          } else {
            connectionStatus = 'disconnected';
            isInitializing = false;
            sock = null;
          }
        } else if (connection === 'open') {
          connectionStatus = 'connected';
          qrCodeDataUrl = null;
          isInitializing = false;
          const userJid = sock.user?.id || '';
          connectedUser = userJid.split(':')[0] || userJid.split('@')[0] || 'Connected';
          console.log(`✅ WhatsApp Web bot connected successfully as: ${connectedUser}`);
          clearTimeout(timer);
          finish({ status: connectionStatus, qrCode: null, connectedUser });
        }
      });
    });

    sock.ev.on('creds.update', async () => {
      try {
        ensureAuthDir();
        await saveCreds();
      } catch (saveErr) {
        console.warn('Silent note on creds update save:', saveErr.message);
      }
    });

    return await initPromise;
  } catch (err) {
    isInitializing = false;
    connectionStatus = 'disconnected';
    console.error('Error initializing WhatsApp socket:', err);
    throw err;
  }
}

function getWhatsAppStatus() {
  // If disconnected and not already initializing, auto-start initialization in background!
  if (connectionStatus === 'disconnected' && !isInitializing) {
    console.log('🔄 WhatsApp is disconnected. Auto-initializing WhatsApp socket in background...');
    initWhatsApp(true).catch((err) => console.error('Auto-init error:', err.message));
  }

  return {
    isConnected: connectionStatus === 'connected',
    status: connectionStatus,
    qrCode: qrCodeDataUrl,
    user: connectedUser,
  };
}

async function sendWhatsAppMessage(toPhone, text) {
  if (connectionStatus !== 'connected' || !sock) {
    throw new Error('WhatsApp Web is not connected. Please scan the QR code first.');
  }

  const jid = formatPhoneNumber(toPhone);
  if (!jid) {
    throw new Error(`Invalid recipient phone number: ${toPhone}`);
  }

  const result = await sock.sendMessage(jid, { text });
  return {
    success: true,
    messageId: result?.key?.id || `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

async function sendWhatsAppDocument(toPhone, documentBuffer, fileName, caption, mimetype = 'application/pdf') {
  if (connectionStatus !== 'connected' || !sock) {
    throw new Error('WhatsApp Web is not connected. Please scan the QR code first.');
  }

  const jid = formatPhoneNumber(toPhone);
  if (!jid) {
    throw new Error(`Invalid recipient phone number: ${toPhone}`);
  }

  const result = await sock.sendMessage(jid, {
    document: documentBuffer,
    mimetype,
    fileName: fileName || 'Document.pdf',
    caption: caption || ''
  });

  return {
    success: true,
    messageId: result?.key?.id || `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

async function logoutWhatsApp() {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
    }
  } catch (e) {
    console.warn('Error during socket logout:', e.message);
  }

  connectionStatus = 'disconnected';
  connectedUser = null;
  qrCodeDataUrl = null;
  sock = null;
  isInitializing = false;

  clearAuthDir();

  return { success: true, message: 'Logged out successfully' };
}

async function getPairingCode(phoneNumber) {
  if (!phoneNumber) throw new Error('Phone number is required for pairing code');
  let cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    cleanPhone = '94' + cleanPhone.substring(1);
  } else if (cleanPhone.length === 9) {
    cleanPhone = '94' + cleanPhone;
  }

  if (!sock) {
    await initWhatsApp(true);
  }

  if (sock && sock.requestPairingCode) {
    const code = await sock.requestPairingCode(cleanPhone);
    return { success: true, pairingCode: code };
  }
  throw new Error('Socket not ready for pairing code request');
}

module.exports = {
  initWhatsApp,
  getWhatsAppStatus,
  sendWhatsAppMessage,
  sendWhatsAppDocument,
  logoutWhatsApp,
  formatPhoneNumber,
  getPairingCode,
};
