import { env } from '@/lib/env';

/**
 * Email provider abstraction.
 *
 * OpenHub never requires a paid email service. The default provider logs to the
 * server console, which is enough for development and for self-hosters who pipe
 * logs into their own mailer. A dependency-free webhook provider and a Resend
 * adapter are included; add your own by implementing `EmailProvider`.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  async send(message: EmailMessage): Promise<void> {
    console.log(
      `[email:console] to=${message.to} subject="${message.subject}"\n${message.text}\n`,
    );
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  async send(message: EmailMessage): Promise<void> {
    const apiKey = env().RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env().EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend request failed (${response.status})`);
    }
  }
}

/**
 * Posts the message to a local HTTP endpoint. This is the easiest way to plug
 * in SMTP, Mailgun, Postmark or an internal relay without adding dependencies.
 */
class WebhookEmailProvider implements EmailProvider {
  readonly name = 'webhook';

  async send(message: EmailMessage): Promise<void> {
    const url = process.env.EMAIL_WEBHOOK_URL;
    if (!url) throw new Error('EMAIL_WEBHOOK_URL is not configured');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env().EMAIL_FROM, ...message }),
    });
    if (!response.ok) throw new Error(`Email webhook failed (${response.status})`);
  }
}

export function emailProvider(): EmailProvider {
  const configured = env().EMAIL_PROVIDER;
  if (configured === 'resend') return new ResendEmailProvider();
  if (process.env.EMAIL_WEBHOOK_URL) return new WebhookEmailProvider();
  return new ConsoleEmailProvider();
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  try {
    await emailProvider().send(message);
    return true;
  } catch (error) {
    // Email is best-effort: a failing provider must never break a user action.
    console.error('[email] delivery failed', error);
    return false;
  }
}

/** Small helper used by notification + auth emails. */
export function renderEmail(title: string, lines: string[]): { text: string; html: string } {
  const text = `${title}\n\n${lines.filter(Boolean).join('\n')}\n\n- OpenHub`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin-bottom:12px">${title}</h1>
    ${lines.filter(Boolean).map((line) => `<p style="line-height:1.5;color:#1f2937">${line}</p>`).join('')}
    <p style="color:#6b7280;font-size:12px;margin-top:24px">OpenHub - community utilities</p>
  </div>`;
  return { text, html };
}
