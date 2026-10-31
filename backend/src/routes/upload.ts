import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router: Router = Router();

router.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const file = req.file as any;
    const fileUrl = file.path || file.secure_url || file.url;

    if (!fileUrl) {
      console.error('Cloudinary did not return a URL. req.file:', file);
      res.status(500).json({ success: false, message: 'Failed to retrieve URL from storage provider' });
      return;
    }

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: file.filename || file.public_id,
      }
    });
  })
);

export default router;
