const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID;
const MICROSOFT_EMAIL = process.env.MICROSOFT_EMAIL || 'Admin@corporate-mart.com';

// Cache token in memory to avoid requesting a new token for every email
let tokenCache = {
  token: null,
  expiresAt: 0,
};

/**
 * 1. Fetch or reuse an active Microsoft Graph access token
 */
async function getAccessToken() {
  const now = Date.now();
  // Reuse token if still valid for at least 2 more minutes
  if (tokenCache.token && tokenCache.expiresAt > now + 120000) {
    return tokenCache.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Microsoft OAuth token failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + ((data.expires_in || 3600) * 1000);
  return tokenCache.token;
}

/**
 * 2. Send email via Microsoft Graph API
 */
async function sendEmail({ to, subject, html, text, fromName = 'Corporate Mart', replyTo, attachments = [] }) {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MICROSOFT_TENANT_ID) {
    console.warn('[Mailer] Microsoft Graph credentials not fully configured in environment.');
    return { success: false, skipped: true };
  }

  const token = await getAccessToken();

  // Support array of emails or single comma-separated string
  const recipientList = Array.isArray(to) ? to : String(to).split(/[,;]/);
  const recipients = recipientList
    .map((email) => (typeof email === 'string' ? email.trim() : ''))
    .filter((email) => email && email.includes('@'))
    .map((address) => ({ emailAddress: { address } }));

  if (recipients.length === 0) {
    throw new Error('No recipient email specified');
  }

  const senderEmail = MICROSOFT_EMAIL;

  const message = {
    subject,
    body: {
      contentType: html ? 'HTML' : 'Text',
      content: html || text || '',
    },
    toRecipients: recipients,
    from: {
      emailAddress: {
        name: fromName,
        address: senderEmail,
      },
    },
    replyTo: [
      {
        emailAddress: {
          address: replyTo || senderEmail,
        },
      },
    ],
  };

  // Attach Microsoft Graph File Attachments if provided
  if (Array.isArray(attachments) && attachments.length > 0) {
    message.attachments = attachments.map((att) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.name || att.fileName || 'attachment.pdf',
      contentType: att.contentType || att.mimeType || 'application/pdf',
      contentBytes: att.contentBytes, // base64-encoded string
    }));
  }

  const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`;
  const res = await fetch(sendMailUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      saveToSentItems: 'true',
    }),
  });

  if (res.status !== 202 && res.status !== 200) {
    const err = await res.text();
    throw new Error(`Send mail failed (${res.status}): ${err}`);
  }

  return { success: true };
}

module.exports = { sendEmail, getAccessToken };
