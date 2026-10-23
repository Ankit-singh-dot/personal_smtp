import nodemailer, { SendMailOptions } from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { SmtpConfig, ImapConfig } from './types';

export async function testSmtpConnection(config: SmtpConfig): Promise<{
  success: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports (587)
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    });

    await transporter.verify();
    return {
      success: true,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      error: err.message || 'SMTP Authentication failed',
    };
  }
}

export async function testImapConnection(config: ImapConfig): Promise<{
  success: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();
    return {
      success: true,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      error: err.message || 'IMAP Authentication failed',
    };
  }
}

export async function sendEmailMessage(
  smtpConfig: SmtpConfig,
  imapConfig: ImapConfig,
  options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const senderDomain = smtpConfig.fromEmail.includes('@')
      ? smtpConfig.fromEmail.split('@')[1]
      : 'thefounders.co.in';

    const customMessageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@${senderDomain}>`;

    const mailOptions = {
      from: `"${smtpConfig.fromName || 'The Founders'}" <${smtpConfig.fromEmail}>`,
      to: options.to,
      replyTo: smtpConfig.replyTo || smtpConfig.fromEmail,
      subject: options.subject,
      text: options.text,
      html: options.html,
      messageId: customMessageId,
      headers: {
        'X-Mailer': 'Founders-Direct-Engine/2.0',
        'X-Entity-Ref-ID': customMessageId,
      },
    };

    const info = await transporter.sendMail(mailOptions);

    // Save to IMAP Sent folder if enabled (equivalent to Make.com saveAfterSent)
    if (imapConfig && imapConfig.enabled && imapConfig.host && imapConfig.user) {
      appendMessageToImap(imapConfig, mailOptions).catch((err) => {
        console.warn('IMAP append error (non-fatal):', err.message);
      });
    }

    return {
      success: true,
      messageId: info.messageId || customMessageId,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message || 'Failed to send email via SMTP',
    };
  }
}

async function appendMessageToImap(
  imapConfig: ImapConfig,
  mailOptions: SendMailOptions
) {
  const client = new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.secure,
    auth: {
      user: imapConfig.user,
      pass: imapConfig.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    logger: false,
  });

  try {
    await client.connect();
    const folder = imapConfig.sentFolder || 'Sent';

    // Construct simple raw RFC 2822 buffer
    const rawHeaders = [
      `From: ${mailOptions.from}`,
      `To: ${mailOptions.to}`,
      `Subject: ${mailOptions.subject}`,
      `Message-ID: ${mailOptions.messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      '',
      mailOptions.html as string,
    ].join('\r\n');

    await client.append(folder, Buffer.from(rawHeaders, 'utf-8'), ['\\Seen']);
    await client.logout();
  } catch (err: unknown) {
    const error = err as Error;
    console.error('IMAP sync failed:', error.message);
    try {
      await client.logout();
    } catch {
      // ignore logout failure
    }
  }
}
