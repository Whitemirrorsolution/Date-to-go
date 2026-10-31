import 'dotenv/config';
import https from 'https';

const token = process.env.WHATSAPP_TOKEN || '';
const phoneNumberId = process.env.WHATSAPP_PHONE_ID || '';
const phone = '919876543210'; // dummy number
const otp = '123456';

const data = JSON.stringify({
  messaging_product: 'whatsapp',
  to: phone,
  type: 'template',
  template: {
    name: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
    language: { code: 'en_US' },
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: otp }]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: otp }]
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

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', chunk => responseData += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', responseData);
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e.message);
});

req.write(data);
req.end();
