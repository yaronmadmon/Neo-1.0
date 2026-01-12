/**
 * Email Integration Provider
 */

import type { IntegrationActionHandler, IntegrationActionContext, IntegrationActionResult, IntegrationConfig } from '../types.js';
import { integrationRegistry } from '../registry.js';
import type { IntegrationProvider } from '../types.js';

async function sendEmail(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { to, subject, body, html } = ctx.payload;
  
  if (!to || !subject || (!body && !html)) {
    return {
      success: false,
      error: 'Missing required parameters: to, subject, body or html',
    };
  }

  // Mock implementation - replace with actual SMTP/SendGrid/Mailgun API call
  // For SMTP:
  // const transporter = nodemailer.createTransport({
  //   host: config.settings.smtpHost,
  //   port: config.settings.smtpPort,
  //   auth: {
  //     user: config.settings.smtpUser,
  //     pass: config.settings.smtpPassword,
  //   },
  // });
  // await transporter.sendMail({ from: config.settings.fromEmail, to, subject, text: body, html });

  return {
    success: true,
    data: {
      id: `email_${Date.now()}`,
      to,
      from: config.settings.fromEmail,
      subject,
      status: 'sent',
    },
  };
}

export function registerEmailProvider(): void {
  const provider: IntegrationProvider = {
    id: 'email',
    displayName: 'Email',
    description: 'Send emails via SMTP, SendGrid, or Mailgun',
    requiredSettings: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail'],
    optionalSettings: ['smtpSecure'],
    actions: [
      {
        id: 'send_email',
        displayName: 'Send Email',
        description: 'Send an email',
        handler: sendEmail,
        requiredParams: ['to', 'subject'],
        optionalParams: ['body', 'html', 'cc', 'bcc'],
      },
    ],
  };

  integrationRegistry.registerProvider(provider);
}
