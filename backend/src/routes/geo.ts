import { Router } from 'express';
import https from 'https';

export const geoRouter: Router = Router();

geoRouter.get('/pincode/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    
    // Use native https instead of fetch to avoid Node version issues
    const data = await new Promise<any>((resolve, reject) => {
      https.get(`https://api.postalpincode.in/pincode/${pin}`, (response) => {
        let rawData = '';
        response.on('data', (chunk) => { rawData += chunk; });
        response.on('end', () => {
          try {
            resolve(JSON.parse(rawData));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (e) => reject(e));
    });
    
    if (data && data[0] && data[0].Status === 'Success') {
      const postOffice = data[0].PostOffice[0];
      res.json({
        success: true,
        pincode: pin,
        city: postOffice.District,
        state: postOffice.State
      });
      return;
    }

    res.status(404).json({ success: false, message: 'Pincode not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during pincode lookup' });
  }
});
