const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text }) {
  // If SMTP credentials are set, use them
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"GeoPhoto App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`✉️ Real email sent to ${to}`);
    return { success: true, type: 'real' };
  }

  // Fallback: Create a test Ethereal account if no SMTP is configured
  console.log('💡 No SMTP credentials found in .env. Creating test email account...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"GeoPhoto App" <noreply@geophoto.com>',
      to,
      subject,
      text,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`✉️ Test email sent to ${to}`);
    console.log(`🔗 Preview URL: ${previewUrl}`);
    return { success: true, type: 'test', previewUrl };
  } catch (err) {
    console.error('❌ Failed to send test email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
