// sendinvite.js
// Run: npm install nodemailer, then: node sendinvite.js

const nodemailer = require('nodemailer');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       ProxySocket Email Sender       ║');
  console.log('╚══════════════════════════════════════╝\n');

  // ─── Gmail credentials ─────────────────────────────────
  const gmailUser = await ask('  Gmail address: ');
  const rawPassword = await ask('  App password: ');

  // Strip spaces from app password (Google shows it as "mlps uokh qryy uqpf")
  const appPassword = rawPassword.replace(/\s/g, '');

  if (appPassword.length === 0) {
    console.log('\n  ✗ App password cannot be empty. Exiting.');
    rl.close();
    return;
  }

  // ─── Email content ─────────────────────────────────────
  const subject = await ask('  Subject line: ');

  if (subject.length === 0) {
    console.log('\n  ✗ Subject line cannot be empty. Exiting.');
    rl.close();
    return;
  }

  const senderName = await ask('  Sender display name (e.g. ProxySocket): ') || 'ProxySocket';

  // ─── Template ──────────────────────────────────────────
  const templateFile = await ask('  HTML template file (e.g. invite.html): ');

  if (!fs.existsSync(templateFile)) {
    console.log(`\n  ✗ File not found: ${templateFile}`);
    rl.close();
    return;
  }

  const htmlBody = fs.readFileSync(templateFile, 'utf8');
  console.log(`  ✓ Template loaded (${(htmlBody.length / 1024).toFixed(1)} KB)`);

  // ─── Recipients ────────────────────────────────────────
  console.log('\n  How would you like to add recipients?\n');
  console.log('    1 — Load from a .txt file (one email per line)');
  console.log('    2 — Type/paste emails manually\n');

  const method = await ask('  Choose (1 or 2): ');

  let recipients = [];

  if (method === '1') {
    const emailFile = await ask('  Email list file (e.g. emails.txt): ');

    if (!fs.existsSync(emailFile)) {
      console.log(`\n  ✗ File not found: ${emailFile}`);
      rl.close();
      return;
    }

    recipients = fs
      .readFileSync(emailFile, 'utf8')
      .split('\n')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));
  } else {
    console.log('\n  Paste emails (one per line). Type "done" when finished:\n');
    while (true) {
      const email = await ask('    > ');
      if (email.toLowerCase() === 'done') break;
      if (email.includes('@')) {
        recipients.push(email);
      } else if (email.length > 0) {
        console.log('      Invalid email, skipped');
      }
    }
  }

  if (recipients.length === 0) {
    console.log('\n  ✗ No recipients found. Exiting.');
    rl.close();
    return;
  }

  // ─── Confirm ───────────────────────────────────────────
  console.log('\n  ┌─────────────────────────────────────┐');
  console.log('  │         Review & Confirm             │');
  console.log('  ├─────────────────────────────────────┤');
  console.log(`  │  From:       ${senderName} <${gmailUser}>`);
  console.log(`  │  Subject:    ${subject}`);
  console.log(`  │  Template:   ${templateFile}`);
  console.log(`  │  Recipients: ${recipients.length} emails`);
  console.log('  ├─────────────────────────────────────┤');
  recipients.forEach((e, i) => {
    console.log(`  │  ${String(i + 1).padStart(2)}. ${e}`);
  });
  console.log('  └─────────────────────────────────────┘\n');

  const confirm = await ask('  Send all emails? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('\n  Cancelled. No emails sent.');
    rl.close();
    return;
  }

  // ─── Send ──────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: appPassword,
    },
  });

  console.log('\n  Connecting to Gmail...');
  try {
    await transporter.verify();
    console.log('  ✓ Connected\n');
  } catch (err) {
    console.log(`\n  ✗ Connection failed: ${err.message}`);
    console.log('\n  Make sure you:');
    console.log('    1. Enabled 2-Step Verification on your Google account');
    console.log('    2. Created an App Password at https://myaccount.google.com/apppasswords');
    console.log('    3. Used the 16-character App Password (not your regular password)\n');
    rl.close();
    return;
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const email = recipients[i];
    const progress = `[${i + 1}/${recipients.length}]`;

    try {
      await transporter.sendMail({
        from: `${senderName} <${gmailUser}>`,
        to: email,
        subject: subject,
        html: htmlBody,
      });
      console.log(`  ${progress} ✓ ${email}`);
      sent++;
    } catch (err) {
      console.log(`  ${progress} ✗ ${email} — ${err.message}`);
      failed++;
    }

    if (i < recipients.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // ─── Summary ───────────────────────────────────────────
  console.log('\n  ┌─────────────────────────────────────┐');
  console.log('  │              Summary                 │');
  console.log('  ├─────────────────────────────────────┤');
  console.log(`  │  ✓ Sent:     ${sent}`);
  console.log(`  │  ✗ Failed:   ${failed}`);
  console.log(`  │  Total:      ${recipients.length}`);
  console.log('  └─────────────────────────────────────┘\n');

  rl.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  rl.close();
});
