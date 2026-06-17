const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Cache variables for Nodemailer transport
let cachedTransporter = null;

// Path for the local email debug log file
const debugLogPath = path.join(__dirname, '../debug-emails.json');

/**
 * Appends a sent email's details to a local rolling JSON audit log.
 */
function appendToLocalLog(emailDetail) {
  try {
    let emails = [];
    if (fs.existsSync(debugLogPath)) {
      const data = fs.readFileSync(debugLogPath, 'utf8');
      emails = JSON.parse(data);
    }
    
    // Insert new email at the beginning
    emails.unshift(emailDetail);
    
    // Keep only the last 10 emails
    emails = emails.slice(0, 10);
    
    fs.writeFileSync(debugLogPath, JSON.stringify(emails, null, 2), 'utf8');
    
    // Print a clean console table for easy terminal visualization
    console.log('\n--- 📂 Local Email Log ---');
    console.table(emails.map(e => ({
      time: new Date(e.timestamp).toLocaleTimeString(),
      to: e.to,
      subject: e.subject,
      code: e.code
    })));
  } catch (err) {
    console.warn('⚠️ Failed to write to local email log:', err.message);
  }
}

/**
 * Sends a premium verification email. Falls back to Ethereal mock email in dev.
 */
async function sendEmail({ to, subject, text }) {
  // Extract 8-digit verification code if present
  const codeMatch = text.match(/\b\d{8}\b/);
  const verificationCode = codeMatch ? codeMatch[0] : 'N/A';

  // Premium responsive dark-themed HTML template
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        background-color: #06091a;
        color: #e9eeff;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }
      .container {
        max-width: 520px;
        margin: 30px auto;
        background-color: #0d1327;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-bottom: 16px;
      }
      .logo-icon {
        font-size: 24px;
        margin-right: 8px;
      }
      .logo-text {
        font-size: 20px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: 0.5px;
      }
      .body-text {
        font-size: 14px;
        line-height: 1.6;
        color: #ccd6f6;
        margin-bottom: 20px;
      }
      .code-container {
        background: linear-gradient(135deg, rgba(124, 106, 255, 0.15), rgba(34, 211, 238, 0.05));
        border: 1px dashed rgba(124, 106, 255, 0.35);
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        margin: 28px 0;
      }
      .code-label {
        margin: 0 0 8px 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #8892b0;
        font-weight: 600;
      }
      .code {
        font-size: 34px;
        font-weight: 800;
        letter-spacing: 6px;
        color: #a89aff;
        font-family: monospace;
        margin: 0;
        text-shadow: 0 0 12px rgba(124, 106, 255, 0.3);
      }
      .footer {
        margin-top: 32px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding-top: 16px;
        font-size: 11px;
        color: #8892b0;
        text-align: center;
        line-height: 1.5;
      }
      .signature {
        margin-top: 12px;
        font-size: 12px;
        color: #a89aff;
        font-weight: 500;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="logo-icon">🗺️</span>
        <span class="logo-text">GeoPhoto</span>
      </div>
      <p class="body-text">Hello,</p>
      <p class="body-text">We received a request to access your account security verification code.</p>
      
      <div class="code-container">
        <p class="code-label">Verification Code</p>
        <h1 class="code">${verificationCode}</h1>
      </div>
      
      <p class="body-text">Enter this code on the signup or password reset page to complete your request.</p>
      <p class="body-text">If you did not request this, you can safely ignore this email.</p>
      
      <div class="footer">
        <p>This is an automated notification from GeoPhoto.</p>
        <p class="signature">Hi HyLight team, I hope I will get the job! 😊</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const emailLogDetail = {
    timestamp: new Date().toISOString(),
    to,
    subject,
    code: verificationCode,
    text
  };

  // --- Real SMTP Transporter Mode ---
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      if (!cachedTransporter) {
        console.log('⚡ Initializing and caching real SMTP transporter...');
        cachedTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        console.log('⚡ Reusing cached SMTP transporter');
      }

      await cachedTransporter.sendMail({
        from: `"GeoPhoto App" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html: htmlContent
      });

      console.log(`✉️ Real email sent to ${to}`);
      appendToLocalLog(emailLogDetail);
      return { success: true, type: 'real' };
    } catch (err) {
      console.error('❌ Real SMTP send failed, falling back to local audit log:', err.message);
      appendToLocalLog({ ...emailLogDetail, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // --- Fallback Ethereal Transporter Mode ---
  try {
    if (!cachedTransporter) {
      console.log('💡 No SMTP credentials found in .env. Creating and caching test email account...');
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } else {
      console.log('⚡ Reusing cached Ethereal SMTP transporter');
    }

    const info = await cachedTransporter.sendMail({
      from: '"GeoPhoto App" <noreply@geophoto.com>',
      to,
      subject,
      text,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`✉️ Test email sent to ${to}`);
    console.log(`🔗 Preview URL: ${previewUrl}`);
    
    appendToLocalLog({ ...emailLogDetail, previewUrl });
    return { success: true, type: 'test', previewUrl };
  } catch (err) {
    console.error('❌ Failed to send test email, saving to local audit log only:', err.message);
    appendToLocalLog({ ...emailLogDetail, error: err.message });
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
