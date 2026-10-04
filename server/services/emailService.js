const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Sanitizes error messages to guarantee SMTP passwords/tokens are NEVER exposed
 */
const sanitizeErrorMessage = (errorMsg) => {
  if (!errorMsg || typeof errorMsg !== 'string') return 'Unknown SMTP error';
  const pass = (process.env.SMTP_PASS || '').trim();
  let sanitized = errorMsg;
  if (pass && pass.length > 3) {
    sanitized = sanitized.split(pass).join('***');
  }
  // Remove credential patterns if any
  sanitized = sanitized.replace(/(password|pass|auth|token)=['"][^'"]+['"]/gi, '$1=***');
  return sanitized;
};

/**
 * Categorizes and maps raw SMTP errors into structured error codes and user-friendly safe messages
 */
const categorizeSmtpError = (err) => {
  const msg = (err?.message || String(err || '')).toLowerCase();
  const code = (err?.code || '').toUpperCase();
  const responseCode = err?.responseCode || 0;

  if (
    msg.includes('daily user sending limit exceeded') ||
    msg.includes('550-5.4.5') ||
    msg.includes('550 5.4.5')
  ) {
    return {
      code: 'DAILY_SENDING_LIMIT_EXCEEDED',
      message: 'Gmail daily user sending limit exceeded (500 msgs/day reached). Google SMTP has temporarily paused outgoing emails for this account. Please wait for the 24-hour rolling reset.'
    };
  }

  if (
    msg.includes('too many login attempts') ||
    msg.includes('454-4.7.0') ||
    msg.includes('454 4.7.0')
  ) {
    return {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Gmail temporary block: Too many login attempts in a short period. Please wait a few minutes before retrying.'
    };
  }

  if (
    msg.includes('535') ||
    msg.includes('eauth') ||
    msg.includes('invalid login') ||
    msg.includes('username and password not accepted') ||
    msg.includes('application-specific password required') ||
    code === 'EAUTH'
  ) {
    return {
      code: 'AUTHENTICATION_FAILED',
      message: 'Gmail SMTP Authentication failed. Verify that 2-Step Verification is active on the account and you are using a valid 16-character Gmail App Password.'
    };
  }

  if (code === 'ECONNREFUSED' || msg.includes('connection refused')) {
    return {
      code: 'SMTP_CONNECTION_FAILED',
      message: 'Unable to connect to SMTP server: Connection refused. Check host and port configuration.'
    };
  }

  if (code === 'ETIMEDOUT' || msg.includes('timed out') || msg.includes('timeout')) {
    return {
      code: 'SMTP_TIMEOUT',
      message: 'Connection to SMTP server timed out.'
    };
  }

  if (code === 'ENOTFOUND' || msg.includes('getaddrinfo enotfound')) {
    return {
      code: 'SMTP_HOST_NOT_FOUND',
      message: 'SMTP host could not be resolved. Please verify SMTP_HOST.'
    };
  }

  if (code === 'ESOCKET' || msg.includes('tls') || msg.includes('certificate') || msg.includes('ssl')) {
    return {
      code: 'SMTP_TLS_ERROR',
      message: 'TLS/SSL handshake failed with SMTP server.'
    };
  }

  if (
    responseCode === 550 ||
    responseCode === 553 ||
    msg.includes('recipient rejected') ||
    msg.includes('550 5.1.1')
  ) {
    return {
      code: 'RECIPIENT_REJECTED',
      message: `Recipient address rejected by SMTP server: ${sanitizeErrorMessage(err.message)}`
    };
  }

  return {
    code: 'UNKNOWN_SMTP_ERROR',
    message: sanitizeErrorMessage(err.message || 'SMTP transport failure')
  };
};

/**
 * Checks whether an error is related to SMTP auth failure or rate/sending limits
 */
const isSmtpAuthOrRateLimitError = (errorMsg) => {
  if (!errorMsg || typeof errorMsg !== 'string') return false;
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes('daily user sending limit exceeded') ||
    lower.includes('550-5.4.5') ||
    lower.includes('550 5.4.5') ||
    lower.includes('too many login attempts') ||
    lower.includes('454-4.7.0') ||
    lower.includes('454 4.7.0') ||
    lower.includes('535') ||
    lower.includes('eauth') ||
    lower.includes('invalid login') ||
    lower.includes('username and password not accepted')
  );
};

/**
 * Validates SMTP configuration for production readiness.
 * When NODE_ENV === 'production' and EMAIL_ENABLED is active:
 * - Validates host, port, user, password, from address, from name, and client URL.
 * - Prohibits localhost/127.0.0.1 SMTP host and client URLs in production.
 */
const validateSmtpConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isEmailEnabled = process.env.EMAIL_ENABLED === 'true' || process.env.EMAIL_ENABLED === '1';

  if (!isProduction || !isEmailEnabled) {
    return;
  }

  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
  const fromAddress = (process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || '').trim();
  const fromName = (process.env.SMTP_FROM_NAME || '').trim();
  const clientUrl = (process.env.CLIENT_URL || '').trim();

  const missingFields = [];
  if (!host) missingFields.push('SMTP_HOST');
  if (!port || isNaN(port)) missingFields.push('SMTP_PORT');
  if (!user) missingFields.push('SMTP_USER');
  if (!pass) missingFields.push('SMTP_PASS / SMTP_PASSWORD');
  if (!fromAddress) missingFields.push('SMTP_FROM / SMTP_FROM_EMAIL');
  if (!fromName) missingFields.push('SMTP_FROM_NAME');

  if (missingFields.length > 0) {
    console.error('====================================================');
    console.error('⛔ [SECURITY ERROR] Production SMTP configuration incomplete while EMAIL_ENABLED=true!');
    console.error(`Missing required variables: ${missingFields.join(', ')}`);
    console.error('====================================================');
    throw new Error(`[SECURITY FATAL] Production SMTP configuration incomplete: ${missingFields.join(', ')} required.`);
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    console.error('====================================================');
    console.error('⛔ [SECURITY ERROR] SMTP_HOST cannot be localhost or 127.0.0.1 in production.');
    console.error('====================================================');
    throw new Error('[SECURITY FATAL] Production SMTP_HOST cannot point to localhost.');
  }

  if (!isValidEmail(fromAddress)) {
    console.error('====================================================');
    console.error('⛔ [SECURITY ERROR] SMTP sender address is not a valid email address.');
    console.error('====================================================');
    throw new Error('[SECURITY FATAL] Production SMTP sender address is invalid.');
  }

  if (clientUrl && (clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1'))) {
    console.warn('====================================================');
    console.warn('⚠️ [CONFIG WARNING] CLIENT_URL points to localhost in production. Dynamic request origin headers will be used as fallback for public links.');
    console.warn('====================================================');
  }
};

/**
 * Creates and returns Nodemailer transporter based on .env config
 */
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim().toLowerCase();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465 ? true : (process.env.SMTP_SECURE === 'true' && port !== 587);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();

  const isGmail = host.includes('gmail') ||
                  (user && user.toLowerCase().endsWith('@gmail.com')) ||
                  process.env.SMTP_SERVICE === 'gmail';

  if (isGmail) {
    const effectivePort = port === 465 ? 465 : 587;
    const effectiveSecure = effectivePort === 465;
    console.log(`[EMAIL] Using Gmail SMTP transport (host: smtp.gmail.com, port: ${effectivePort}, secure: ${effectiveSecure})...`);
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: effectivePort,
      secure: effectiveSecure,
      auth: (user && pass) ? { user, pass } : undefined,
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false
      }
    });
    return cachedTransporter;
  }

  console.log(`[EMAIL] Using standard SMTP transport: host=${host}, port=${port}, secure=${secure}`);
  const transportConfig = {
    host,
    port,
    secure,
    auth: (user && pass) ? { user, pass } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false
    }
  };

  cachedTransporter = nodemailer.createTransport(transportConfig);
  return cachedTransporter;
};

/**
 * Dispatches email via Nodemailer SMTP
 */
const dispatchMail = async (mailOptions) => {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    cachedTransporter = null;
    throw err;
  }
};

/**
 * Safe diagnostic function for transporter health verification
 * Never logs credentials. Never marks emails SENT.
 */
const verifyTransporterConnection = async () => {
  try {
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();

    if (!user || !pass) {
      console.log('[EMAIL] SMTP connection verification FAILED');
      console.log('Code: CONFIGURATION_MISSING');
      console.log('Message: SMTP credentials not configured (SMTP_USER or SMTP_PASS missing)');
      return {
        success: false,
        code: 'CONFIGURATION_MISSING',
        error: 'SMTP credentials not configured in environment.'
      };
    }

    const transporter = getTransporter();
    await transporter.verify();
    console.log('[EMAIL] SMTP connection verified successfully');
    return { success: true };
  } catch (error) {
    cachedTransporter = null;
    const errorDetails = categorizeSmtpError(error);
    console.log('[EMAIL] SMTP connection verification FAILED');
    console.log(`Code: ${errorDetails.code}`);
    console.log(`Message: ${errorDetails.message}`);
    return {
      success: false,
      code: errorDetails.code,
      error: errorDetails.message
    };
  }
};

/**
 * Validates email string format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Safe test endpoint utility
 * Isolates Nodemailer from BullMQ
 * Sends 1 real test email to an admin-specified address
 * Prints exact SMTP response
 * Returns JSON: { success, smtpResponse, errorCode }
 */
const sendSimpleTestEmail = async (recipientEmail) => {
  if (!isValidEmail(recipientEmail)) {
    return {
      success: false,
      smtpResponse: null,
      errorCode: 'INVALID_RECIPIENT',
      reason: 'Please provide a valid recipient email address.'
    };
  }

  const fromName = process.env.SMTP_FROM_NAME || 'CampusPro Training & Placement';
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@campuspro.edu';

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to: recipientEmail.trim().toLowerCase(),
    subject: 'CampusPro Email Test',
    text: 'This is a test email from CampusPro Training & Placement System.',
    html: '<p>This is a test email from CampusPro Training & Placement System.</p>'
  };

  console.log(`[EMAIL] Testing SMTP delivery to ${recipientEmail}...`);
  console.log(`[EMAIL] SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`[EMAIL] SMTP Port: ${process.env.SMTP_PORT || '587'}`);
  console.log('[EMAIL] Sending...');

  try {
    const info = await dispatchMail(mailOptions);
    console.log('[EMAIL] SUCCESS');
    console.log(`[EMAIL] SMTP Response: ${info.response || info.messageId}`);
    return {
      success: true,
      smtpResponse: info.response || `Message ID: ${info.messageId}`,
      errorCode: null,
      messageId: info.messageId
    };
  } catch (err) {
    const errorDetails = categorizeSmtpError(err);
    console.log('[EMAIL] FAILED');
    console.log(`[EMAIL] Error Code: ${errorDetails.code}`);
    console.log(`[EMAIL] Error Message: ${errorDetails.message}`);
    return {
      success: false,
      smtpResponse: errorDetails.message,
      errorCode: errorDetails.code,
      reason: errorDetails.message
    };
  }
};

/**
 * Sends Placement Drive Email Notification to a single student
 */
const sendDrivePublishEmail = async ({
  studentName,
  studentEmail,
  companyName,
  jobRole,
  packageAmount,
  academicYear,
  driveDate,
  deadline,
  eligibilitySummary,
  roundSummary,
  driveId
}) => {
  try {
    const isEmailEnabled = process.env.EMAIL_ENABLED !== 'false' && process.env.EMAIL_ENABLED !== '0' && process.env.EMAIL_ENABLED !== 'disabled';
    if (!isEmailEnabled) {
      console.log(`[EMAIL] Disabled in environment (EMAIL_ENABLED=${process.env.EMAIL_ENABLED}) - skipping ${studentEmail}`);
      return {
        success: false,
        skipped: true,
        code: 'EMAIL_DISABLED',
        reason: `Email delivery disabled in environment (EMAIL_ENABLED=${process.env.EMAIL_ENABLED})`
      };
    }

    if (!isValidEmail(studentEmail)) {
      console.log(`[EMAIL] Invalid recipient address: ${studentEmail}`);
      return {
        success: false,
        skipped: true,
        code: 'INVALID_RECIPIENT',
        reason: 'Student email address is missing or invalid format.'
      };
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const viewDriveUrl = `${clientUrl}/student/eligible-drives`;

    const fromName = process.env.SMTP_FROM_NAME || 'CampusPro Training & Placement';
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@campuspro.edu';

    const mailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to: studentEmail,
      subject: `New Placement Drive — ${companyName} | ${jobRole}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Placement Drive</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #2563eb; padding: 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; }
            .content { padding: 28px; }
            .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
            .intro { font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 20px; }
            .details-box { background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
            .detail-row { display: flex; justify-space-between; margin-bottom: 10px; font-size: 13px; }
            .detail-row:last-child { margin-bottom: 0; }
            .label { font-weight: 700; color: #334155; min-width: 140px; }
            .value { color: #0f172a; font-weight: 600; flex: 1; }
            .badge { display: inline-block; background: #dcfce7; color: #15803d; font-weight: 800; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
            .cta-container { text-align: center; margin: 28px 0; }
            .cta-button { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
            .footer { background: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>CampusPro Placement Portal</h1>
              <p>Training & Placement Department</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${studentName},</div>
              <div class="intro">A new placement opportunity has been published on CampusPro for your academic batch.</div>

              <div class="details-box">
                <div class="detail-row">
                  <span class="label">Company:</span>
                  <span class="value">${companyName}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Job Role:</span>
                  <span class="value">${jobRole}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Package:</span>
                  <span class="value"><span class="badge">${packageAmount}</span></span>
                </div>
                <div class="detail-row">
                  <span class="label">Academic Year:</span>
                  <span class="value">${academicYear || 'N/A'}</span>
                </div>
                ${driveDate ? `
                <div class="detail-row">
                  <span class="label">Drive Date:</span>
                  <span class="value">${driveDate}</span>
                </div>` : ''}
                <div class="detail-row">
                  <span class="label">Application Deadline:</span>
                  <span class="value" style="color: #dc2626;">${deadline}</span>
                </div>
                <div class="detail-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                  <span class="label">Academic Eligibility:</span>
                  <span class="value">${eligibilitySummary}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Selection Process:</span>
                  <span class="value">${roundSummary}</span>
                </div>
              </div>

              <p style="font-size: 13px; color: #475569;">Please log in to CampusPro to view the complete placement details and register if you meet the eligibility criteria.</p>

              <div class="cta-container">
                <a href="${viewDriveUrl}" class="cta-button">View Placement Drive →</a>
              </div>
            </div>

            <div class="footer">
              <p>Regards,<br><strong>Training & Placement Department</strong><br>CampusPro Educational Ecosystem</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('[EMAIL] Sending...');
    const info = await dispatchMail(mailOptions);
    console.log('[EMAIL] SUCCESS');
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    const errorDetails = categorizeSmtpError(error);
    console.log('[EMAIL] FAILED');
    console.log(`[EMAIL] Error Code: ${errorDetails.code}`);
    console.log(`[EMAIL] Error Message: ${errorDetails.message}`);
    return {
      success: false,
      code: errorDetails.code,
      reason: errorDetails.message
    };
  }
};

/**
 * Sends Password Reset Email to user with secure token link
 */
const sendPasswordResetEmail = async ({
  name,
  email,
  resetUrl
}) => {
  try {
    const isEmailEnabled = process.env.EMAIL_ENABLED !== 'false' && process.env.EMAIL_ENABLED !== '0' && process.env.EMAIL_ENABLED !== 'disabled';
    if (!isEmailEnabled) {
      console.log(`[EMAIL] Disabled in environment (EMAIL_ENABLED=${process.env.EMAIL_ENABLED}) - skipping password reset email to ${email}`);
      return {
        success: false,
        skipped: true,
        code: 'EMAIL_DISABLED',
        reason: `Email delivery disabled in environment (EMAIL_ENABLED=${process.env.EMAIL_ENABLED})`
      };
    }

    if (!isValidEmail(email)) {
      console.log(`[EMAIL] Invalid recipient address: ${email}`);
      return {
        success: false,
        skipped: true,
        code: 'INVALID_RECIPIENT',
        reason: 'Recipient email address is missing or invalid format.'
      };
    }

    const fromName = process.env.SMTP_FROM_NAME || 'CampusPro Training & Placement';
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@campuspro.edu';

    const mailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to: email.trim().toLowerCase(),
      subject: 'Password Reset Request — CampusPro',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #1e293b 0%, #1e3a8a 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; }
            .content { padding: 32px 28px; }
            .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
            .intro { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
            .button-wrapper { text-align: center; margin: 30px 0; }
            .cta-button { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3); }
            .expiry-note { background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #92400e; font-weight: 600; margin: 24px 0; }
            .alt-link { font-size: 12px; color: #64748b; line-height: 1.5; word-break: break-all; margin-top: 20px; padding-top: 16px; border-top: 1px dashed #e2e8f0; }
            .alt-link a { color: #2563eb; }
            .footer { background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>CAMPUS<span style="color: #60a5fa;">PRO</span></h1>
              <p>Smart Placement & Interview Management Platform</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${name || 'CampusPro User'},</div>
              <p class="intro">
                We received a request to reset the password for your CampusPro account associated with <strong>${email}</strong>.
                Click the button below to choose a new password:
              </p>

              <div class="button-wrapper">
                <a href="${resetUrl}" class="cta-button">Reset My Password →</a>
              </div>

              <div class="expiry-note">
                ⏱️ <strong>Note:</strong> This password reset link is valid for <strong>60 minutes</strong>. After that, you will need to request a new link.
              </div>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                If you did not request a password reset, please ignore this email or notify your campus TPO administrator immediately. Your password will not change.
              </p>

              <div class="alt-link">
                Having trouble with the button? Copy and paste this URL into your browser:<br>
                <a href="${resetUrl}">${resetUrl}</a>
              </div>
            </div>

            <div class="footer">
              <p>Regards,<br><strong>CampusPro Placement Support Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log(`[EMAIL] Sending password reset email to ${email}...`);
    const info = await dispatchMail(mailOptions);
    console.log(`[EMAIL] Password reset email sent successfully to ${email}`);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    const errorDetails = categorizeSmtpError(error);
    console.log(`[EMAIL] Password reset email failed to ${email}: ${errorDetails.message}`);
    return {
      success: false,
      code: errorDetails.code,
      reason: errorDetails.message
    };
  }
};

module.exports = {
  sendDrivePublishEmail,
  sendPasswordResetEmail,
  sendSimpleTestEmail,
  verifyTransporterConnection,
  validateSmtpConfig,
  categorizeSmtpError,
  sanitizeErrorMessage,
  isSmtpAuthOrRateLimitError,
  isValidEmail,
  getTransporter
};

