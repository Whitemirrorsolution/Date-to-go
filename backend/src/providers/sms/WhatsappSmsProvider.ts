import { logger } from '../../utils/logger.js';
import type { SmsProvider } from './SmsProvider.js';
import https from 'https';

export class WhatsappSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string, _expiresInMinutes: number): Promise<void> {
    const token = process.env.WHATSAPP_TOKEN || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_ID || '';

    if (!token || !phoneNumberId) {
      logger.warn('[WhatsApp] API credentials missing, falling back to console');
      console.log(`\n📱 [WhatsApp] OTP for ${phone}: ${otp}\n`);
      return;
    }

    // WhatsApp API requires country code. If 10 digits, assume India (91).
    let formattedPhone = phone;
    if (formattedPhone.length === 10 && !formattedPhone.startsWith('+')) {
      formattedPhone = `91${formattedPhone}`;
    }
    // Remove any '+' signs
    formattedPhone = formattedPhone.replace('+', '');

    const data = JSON.stringify({
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: otp }
            ]
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: otp }
            ]
          }
        ]
      }
    });

    const options = {
      hostname: 'graph.facebook.com',
      path: `/${process.env.GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            logger.info(`[WhatsApp] OTP sent to ${phone}. Response: ${responseData}`);
            resolve();
          } else {
            logger.error(`[WhatsApp] Failed to send OTP: HTTP ${res.statusCode} - ${responseData}`);
            // Don't reject, just log error so registration doesn't completely fail for the user
            console.log(`\n📱 [WhatsApp fallback] OTP for ${phone}: ${otp}\n`);
            resolve();
          }
        });
      });

      req.on('error', (e) => {
        logger.error(`[WhatsApp] Request error: ${e.message}`);
        resolve();
      });

      req.write(data);
      req.end();
    });
  }
}
