// send-beta-invite.js
// Run: npm install nodemailer, then: node send-beta-invite.js

const nodemailer = require('nodemailer');
const fs = require('fs');

// ─── CONFIG ──────────────────────────────────────────────
const GMAIL_USER = 'r.adeniyi.adetunji@gmail.com';
const GMAIL_APP_PASSWORD = 'YOUR_APP_PASSWORD_HERE'; // See instructions below
const SUBJECT = "You're invited to the closed beta — ProxySocket";

// ─── RECIPIENTS ──────────────────────────────────────────
const recipients = [
  'adeniyi.rilwan.182003@fuoye.edu.ng',
  'adeniyireal1icloud@gmail.com',
  'akahomenjoshua01@gmail.com',
  'alexislordqtest@gmail.com',
  'asadeayomide123@gmail.com',
  'blakeboont@gmail.com',
  'csamkay@gmail.com',
  'dfortune665@gmail.com',
  'emmanueldan.martins15834@gmail.com',
  'loganrnss@gmail.com',
  'loveistrustt@gmail.com',
  'olumidemaleek@gmail.com',
  'samuelinioluwa22@gmail.com',
  'sexytoo7505@gmail.com',
  'smofiyinfoluwa@gmail.com',
  'timileyinadebowale57@gmail.com',
];

// ─── HTML EMAIL ──────────────────────────────────────────
const htmlBody = fs.readFileSync('proxysocket-beta-invite.html', 'utf8');

// ─── SEND ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

async function sendAll() {
  console.log(`Sending to ${recipients.length} recipients...\n`);

  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: `ProxySocket <${GMAIL_USER}>`,
        to: email,
        subject: SUBJECT,
        html: htmlBody,
      });
      console.log(`✓ Sent to ${email}`);
    } catch (err) {
      console.log(`✗ Failed: ${email} — ${err.message}`);
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\nDone!');
}

sendAll();
