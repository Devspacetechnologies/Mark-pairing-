const express = require('express');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const NodeCache = require("node-cache");

const app = express();
const PORT = process.env.PORT || 3000;
const pairingCodeCache = new NodeCache({ stdTTL: 600 });

app.use(express.static('public'));

let sock;

const initWhatsApp = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version, isLatest } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, fs)
    },
    printQRInTerminal: false,
    browser: ['BaileyCodeGen', 'Chrome', '120'],
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr, isNewLogin } = update;

    if (update.pairingCode) {
      pairingCodeCache.set("code", update.pairingCode);
      console.log("Pairing Code:", update.pairingCode);
    }

    if (connection === 'open') {
      console.log("✅ WhatsApp connected");
    }

    if (connection === 'close') {
      console.log("❌ Connection closed. Restarting...");
      initWhatsApp();
    }
  });

  try {
    await sock.waitForConnectionUpdate(u => u.pairingCode, 15000);
  } catch (e) {
    console.error("No pairing code received in time");
  }
};

initWhatsApp();

// API endpoint
app.get('/generate', async (req, res) => {
  const code = pairingCodeCache.get("code");
  if (code) {
    res.json({ success: true, pairingCode: code });
  } else {
    res.json({ success: false, message: "No pairing code available yet" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
