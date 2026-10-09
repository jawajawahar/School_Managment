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
let isPairingInProgress = false;
let activeAuthState = null;
let activeSaveCreds = null;

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

async function initWhatsApp(forceNew = false, phoneNumberForPairing = null, clearAuth = false) {
  // If already connected and not forcing new session, return current status
  if (connectionStatus === 'connected' && sock && !forceNew) {
    return { status: connectionStatus, connectedUser };
  }

  // If already initializing and not forcing new session, return current state
  if (isInitializing && !forceNew) {
    return { status: connectionStatus, qrCode: qrCodeDataUrl, connectedUser };
  }

  // Only clear auth directory if explicitly requested or logged out
  if (clearAuth) {
    clearAuthDir();
  }

  // If forceNew requested, close existing socket instance cleanly
  if (forceNew && sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end(undefined);
    } catch (_) {}
    sock = null;
  }

  isInitializing = true;
  connectionStatus = 'connecting';

  try {
    ensureAuthDir();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    activeAuthState = state;
    activeSaveCreds = saveCreds;

    // Use Desktop macOS tuple for max compatibility with Baileys 7.x pairing code protocol
    const browserTuple = Browsers ? Browsers.macOS('Desktop') : ['Mac OS', 'Chrome', '121.0.6167.85'];

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: browserTuple,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      generateHighQualityLinkPreview: false,
    });

    sock.ev.on('creds.update', async () => {
      try {
        ensureAuthDir();
        await saveCreds();
      } catch (saveErr) {
        console.warn('Silent note on creds update save:', saveErr.message);
      }
    });

    let requestedPairingCode = null;

    const initPromise = new Promise((resolve) => {
      let resolved = false;

      const finish = (result) => {
        if (!resolved) {
          resolved = true;
          isInitializing = false;
          resolve(result);
        }
      };

      // 15-second safety fallback timeout to return HTTP response
      const timer = setTimeout(() => {
        finish({
          status: connectionStatus,
          qrCode: qrCodeDataUrl,
          connectedUser,
          pairingCode: requestedPairingCode
        });
      }, 15000);

      // If phone number is passed for 8-digit pairing code and device is not registered
      if (phoneNumberForPairing && !state.creds.registered) {
        let cleanPhone = String(phoneNumberForPairing).replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0') && cleanPhone.length === 10) cleanPhone = '94' + cleanPhone.substring(1);
        else if (cleanPhone.length === 9) cleanPhone = '94' + cleanPhone;

        setTimeout(async () => {
          try {
            if (sock && !state.creds.registered) {
              isPairingInProgress = true;
              requestedPairingCode = await sock.requestPairingCode(cleanPhone);
              console.log(`🔑 WhatsApp 8-digit Pairing Code generated: ${requestedPairingCode}`);
              clearTimeout(timer);
              finish({
                status: connectionStatus,
                qrCode: null,
                connectedUser: null,
                pairingCode: requestedPairingCode
              });
            }
          } catch (pErr) {
            console.error('Error requesting pairing code in init:', pErr.message);
            isPairingInProgress = false;
          }
        }, 1800);
      }

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !isPairingInProgress) {
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

          isPairingInProgress = false;
          isInitializing = false;
          sock = null;

          // ONLY clear auth directory on explicit device logout (401 / DisconnectReason.loggedOut)
          if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
            console.log('⚠️ WhatsApp account logged out from phone. Clearing credentials.');
            connectionStatus = 'disconnected';
            connectedUser = null;
            qrCodeDataUrl = null;
            clearAuthDir();
          } else {
            // Transient timeout (408), server restart (515), etc. - keep auth files intact!
            console.log('ℹ️ Transient WhatsApp socket close. Retaining credentials for auto-reconnect.');
            connectionStatus = 'disconnected';
          }

          clearTimeout(timer);
          finish({ status: connectionStatus, qrCode: null, connectedUser: null });
        } else if (connection === 'open') {
          connectionStatus = 'connected';
          qrCodeDataUrl = null;
          isInitializing = false;
          isPairingInProgress = false;
          const userJid = sock.user?.id || '';
          connectedUser = userJid.split(':')[0] || userJid.split('@')[0] || 'Connected';
          console.log(`✅ WhatsApp Web bot connected successfully as: ${connectedUser}`);
          clearTimeout(timer);
          finish({ status: connectionStatus, qrCode: null, connectedUser });
        }
      });
    });

    return await initPromise;
  } catch (err) {
    isInitializing = false;
    isPairingInProgress = false;
    connectionStatus = 'disconnected';
    console.error('Error initializing WhatsApp socket:', err);
    throw err;
  }
}

function getWhatsAppStatus() {
  // Auto-connect background socket without clearing auth files if disconnected
  if (connectionStatus === 'disconnected' && !isInitializing && !isPairingInProgress) {
    console.log('🔄 WhatsApp is disconnected. Auto-connecting socket in background...');
    initWhatsApp(false).catch((err) => console.error('Auto-connect background note:', err.message));
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
    throw new Error('WhatsApp Web is not connected. Please scan the QR code or enter 8-digit pairing code first.');
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
    throw new Error('WhatsApp Web is not connected. Please scan the QR code or enter 8-digit pairing code first.');
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
  isPairingInProgress = false;

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

  isPairingInProgress = true;

  // If socket is already active and auth state is ready
  if (sock && activeAuthState && !activeAuthState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(cleanPhone);
      console.log(`🔑 WhatsApp 8-digit Pairing Code generated directly: ${code}`);
      return { success: true, pairingCode: code };
    } catch (err) {
      console.warn('Direct pairing code request failed, initializing dedicated socket:', err.message);
    }
  }

  // Initialize socket preserving auth files, passing pairing phone
  const result = await initWhatsApp(true, cleanPhone, false);
  if (result && result.pairingCode) {
    return { success: true, pairingCode: result.pairingCode };
  }

  if (sock && sock.requestPairingCode) {
    try {
      const code = await sock.requestPairingCode(cleanPhone);
      return { success: true, pairingCode: code };
    } catch (err) {
      throw new Error(`Failed to request pairing code: ${err.message}`);
    }
  }

  throw new Error('WhatsApp socket not ready for pairing code. Please try scanning QR code.');
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

