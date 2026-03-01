// sendinvite.js
// Run: npm install nodemailer chalk, then: node sendinvite.js

const nodemailer = require('nodemailer');
const fs = require('fs');
const readline = require('readline');

// ─── Colors (works without chalk as fallback) ────────────
let c;
try {
  c = require('chalk');
} catch {
  const id = (s) => s;
  const handler = { get: () => id };
  c = new Proxy(id, {
    get: (_, prop) => {
      if (typeof prop === 'symbol') return id;
      const fn = (s) => s;
      return new Proxy(fn, handler);
    },
    apply: (_, __, args) => args[0],
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function log(msg = '') {
  console.log(msg);
}

function divider() {
  log(c.dim('  ─────────────────────────────────────────────'));
}

function header(text) {
  log();
  log(c.bold.cyan(`  ${text}`));
  divider();
}

function success(msg) {
  log(c.green(`  ✓ ${msg}`));
}

function error(msg) {
  log(c.red(`  ✗ ${msg}`));
}

function warn(msg) {
  log(c.yellow(`  ! ${msg}`));
}

function info(msg) {
  log(c.dim(`  ${msg}`));
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function askRequired(question, validator, errorMsg) {
  while (true) {
    const answer = await ask(question);
    if (answer.length === 0) {
      error('This field is required. Please try again.');
      continue;
    }
    if (validator && !validator(answer)) {
      error(errorMsg || 'Invalid input. Please try again.');
      continue;
    }
    return answer;
  }
}

async function askFile(question) {
  while (true) {
    const filepath = await ask(question);
    if (filepath.length === 0) {
      error('Please enter a file path.');
      continue;
    }
    if (!fs.existsSync(filepath)) {
      error(`File not found: ${filepath}`);
      warn('Check the path and try again.');
      continue;
    }
    return filepath;
  }
}

function progressBar(current, total, width = 20) {
  const pct = current / total;
  const filled = Math.round(width * pct);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${current}/${total}`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.clear();
  log();
  log(c.bold.white('  ╔══════════════════════════════════════════╗'));
  log(c.bold.white('  ║                                          ║'));
  log(c.bold.white('  ║') + c.bold.cyan('        ProxySocket Email Sender') + c.bold.white('          ║'));
  log(c.bold.white('  ║                                          ║'));
  log(c.bold.white('  ╚══════════════════════════════════════════╝'));
  log();
  info('Send HTML emails to your beta testers via Gmail.');
  info('Press Ctrl+C at any time to exit.\n');

  // ─── Step 1: Gmail credentials ─────────────────────────
  header('Step 1 — Gmail Credentials');
  log();

  const gmailUser = await askRequired(
    c.white('  Email: '),
    validateEmail,
    'Please enter a valid email address.'
  );

  const rawPassword = await askRequired(c.white('  App Password: '));
  const appPassword = rawPassword.replace(/\s/g, '');

  if (appPassword.length < 8) {
    error('App password seems too short.');
    warn('Get one at: https://myaccount.google.com/apppasswords');
    warn('Make sure 2-Step Verification is enabled first.');
    rl.close();
    return;
  }

  log();
  success(`Gmail: ${gmailUser}`);
  success(`Password: ${'•'.repeat(appPassword.length)}`);

  // ─── Step 2: Email content ─────────────────────────────
  header('Step 2 — Email Content');
  log();

  const senderName = (await ask(c.white('  Sender name [ProxySocket]: '))) || 'ProxySocket';
  const subject = await askRequired(c.white('  Subject: '));

  log();
  success(`From: ${senderName} <${gmailUser}>`);
  success(`Subject: ${subject}`);

  // ─── Step 3: Template ──────────────────────────────────
  header('Step 3 — HTML Template');
  log();

  const templateFile = await askFile(c.white('  Template file: '));

  let htmlBody;
  try {
    htmlBody = fs.readFileSync(templateFile, 'utf8');
  } catch (err) {
    error(`Could not read file: ${err.message}`);
    rl.close();
    return;
  }

  if (!htmlBody.includes('<') || !htmlBody.includes('>')) {
    warn('This file may not be valid HTML. Sending anyway.');
  }

  const sizeKB = (Buffer.byteLength(htmlBody, 'utf8') / 1024).toFixed(1);
  success(`Loaded: ${templateFile} (${sizeKB} KB)`);

  if (htmlBody.includes('YOUR_OPT_IN_LINK_HERE')) {
    log();
    warn('Template contains "YOUR_OPT_IN_LINK_HERE" placeholder.');
    warn('Make sure you replaced it with your actual link!');
    log();
    const proceed = await ask(c.yellow('  Continue anyway? (yes/no): '));
    if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
      log();
      info('Update your template and try again.');
      rl.close();
      return;
    }
  }

  // ─── Step 4: Recipients ────────────────────────────────
  header('Step 4 — Recipients');
  log();
  log(c.white('  How to add recipients:\n'));
  log(`    ${c.cyan('1')} — Load from a .txt file (one email per line)`);
  log(`    ${c.cyan('2')} — Type or paste emails manually`);
  log();

  let method;
  while (true) {
    method = await ask(c.white('  Choose (1 or 2): '));
    if (method === '1' || method === '2') break;
    error('Please enter 1 or 2.');
  }

  let recipients = [];

  if (method === '1') {
    log();
    const emailFile = await askFile(c.white('  Email list file: '));

    let raw;
    try {
      raw = fs.readFileSync(emailFile, 'utf8');
    } catch (err) {
      error(`Could not read file: ${err.message}`);
      rl.close();
      return;
    }

    const lines = raw.split(/\r?\n/).map((e) => e.trim()).filter((e) => e.length > 0);
    let skipped = 0;

    for (const line of lines) {
      const email = line.split(',')[0].trim();
      if (validateEmail(email)) {
        if (!recipients.includes(email)) {
          recipients.push(email);
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    log();
    success(`Loaded ${recipients.length} valid emails`);
    if (skipped > 0) {
      warn(`Skipped ${skipped} invalid or duplicate entries`);
    }
  } else {
    log();
    info('Paste emails one per line. Type "done" when finished.\n');

    while (true) {
      const input = await ask(c.dim('    > '));
      if (input.toLowerCase() === 'done') break;
      if (input.length === 0) continue;

      if (validateEmail(input)) {
        if (!recipients.includes(input)) {
          recipients.push(input);
          log(c.green(`      ✓ Added (${recipients.length} total)`));
        } else {
          warn('Duplicate — already added');
        }
      } else {
        error('Invalid email format');
      }
    }
  }

  if (recipients.length === 0) {
    log();
    error('No valid recipients found. Nothing to send.');
    rl.close();
    return;
  }

  // ─── Step 5: Review ────────────────────────────────────
  header('Step 5 — Review & Confirm');
  log();
  log(c.white('  From:       ') + c.cyan(`${senderName} <${gmailUser}>`));
  log(c.white('  Subject:    ') + c.cyan(subject));
  log(c.white('  Template:   ') + c.cyan(templateFile));
  log(c.white('  Recipients: ') + c.cyan(`${recipients.length} emails`));
  log();
  divider();
  recipients.forEach((e, i) => {
    log(c.dim(`  ${String(i + 1).padStart(3)}.`) + c.white(` ${e}`));
  });
  divider();
  log();

  const confirm = await ask(c.bold.white('  Send all emails? (yes/no): '));

  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    log();
    info('Cancelled. No emails were sent.');
    rl.close();
    return;
  }

  // ─── Step 6: Connect & Send ────────────────────────────
  header('Sending');
  log();
  info('Connecting to Gmail...');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: appPassword,
    },
    pool: true,
    maxConnections: 1,
    rateDelta: 2000,
    rateLimit: 1,
  });

  try {
    await transporter.verify();
    success('Connected to Gmail\n');
  } catch (err) {
    log();
    error('Connection failed\n');

    if (err.message.includes('Invalid login') || err.message.includes('AUTHENTICATIONFAILED')) {
      error('Invalid email or app password.');
      log();
      info('To fix this:');
      info('  1. Go to https://myaccount.google.com/security');
      info('  2. Enable 2-Step Verification');
      info('  3. Go to https://myaccount.google.com/apppasswords');
      info('  4. Generate a new App Password for "Mail"');
      info('  5. Copy the 16-character password (spaces are OK)');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('ENETUNREACH')) {
      error('No internet connection.');
      info('Check your network and try again.');
    } else if (err.message.includes('ETIMEDOUT')) {
      error('Connection timed out.');
      info('Your firewall might be blocking outgoing mail (port 465/587).');
    } else {
      error(`Details: ${err.message}`);
    }

    log();
    rl.close();
    return;
  }

  let sent = 0;
  let failed = 0;
  const failures = [];
  const MAX_RETRIES = 2;

  for (let i = 0; i < recipients.length; i++) {
    const email = recipients[i];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await transporter.sendMail({
          from: `${senderName} <${gmailUser}>`,
          to: email,
          subject: subject,
          html: htmlBody,
        });

        log(`  ${c.dim(progressBar(i + 1, recipients.length))}  ${c.green('✓')} ${email}`);
        sent++;
        break;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          log(`  ${c.dim(progressBar(i + 1, recipients.length))}  ${c.yellow('↻')} ${email} ${c.dim(`retry...`)}`);
          await sleep(3000);
        } else {
          let reason = 'Unknown error';

          if (err.message.includes('Invalid') || err.message.includes('rejected')) {
            reason = 'Invalid or rejected address';
          } else if (err.message.includes('Rate limit') || err.message.includes('too many')) {
            reason = 'Rate limited — try again later';
          } else if (err.message.includes('spam') || err.message.includes('blocked')) {
            reason = 'Blocked by recipient server';
          } else if (err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT')) {
            reason = 'Connection lost — try again later';
          } else {
            reason = err.message.substring(0, 60);
          }

          log(`  ${c.dim(progressBar(i + 1, recipients.length))}  ${c.red('✗')} ${email}`);
          log(c.dim(`     ${reason}`));
          failed++;
          failures.push({ email, reason });
        }
      }
    }

    if (i < recipients.length - 1) {
      await sleep(1500);
    }
  }

  transporter.close();

  // ─── Summary ───────────────────────────────────────────
  log();
  log(c.bold.white('  ╔══════════════════════════════════════════╗'));

  if (failed === 0) {
    log(c.bold.white('  ║') + c.bold.green('           All emails sent!') + c.bold.white('                ║'));
  } else if (sent === 0) {
    log(c.bold.white('  ║') + c.bold.red('           All emails failed') + c.bold.white('               ║'));
  } else {
    log(c.bold.white('  ║') + c.bold.yellow('         Completed with errors') + c.bold.white('             ║'));
  }

  log(c.bold.white('  ╚══════════════════════════════════════════╝'));
  log();
  log(c.white(`     Sent:    `) + c.green(String(sent)));
  log(c.white(`     Failed:  `) + (failed > 0 ? c.red(String(failed)) : c.dim('0')));
  log(c.white(`     Total:   `) + c.dim(String(recipients.length)));

  if (failures.length > 0) {
    log();
    warn('Failed deliveries:');
    failures.forEach((f) => {
      log(c.dim(`     ${f.email} — ${f.reason}`));
    });

    // Save failed emails for retry
    const failedFile = 'failed-emails.txt';
    fs.writeFileSync(failedFile, failures.map((f) => f.email).join('\n'));
    log();
    info(`Failed emails saved to ${failedFile} — retry with this file.`);
  }

  log();
  rl.close();
}

process.on('SIGINT', () => {
  log('\n');
  info('Interrupted. Exiting...\n');
  rl.close();
  process.exit(0);
});

main().catch((err) => {
  error(`Unexpected error: ${err.message}`);
  rl.close();
  process.exit(1);
});
