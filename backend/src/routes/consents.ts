import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { Page } from '../models/Page.js';
import { ConsentLog } from '../models/ConsentLog.js';

export const consentsRouter: Router = Router();

// GET /api/v1/consents/pending
consentsRouter.get('/pending', requireAuth, async (req, res) => {
  try {
    // Find all published pages that require consent
    const requiredPages = await Page.find({ status: 'PUBLISHED', requiresConsent: true });
    if (requiredPages.length === 0) {
      res.json({ success: true, pending: [] });
      return;
    }

    // Get user's latest consent logs for each page
    const userConsents = await ConsentLog.find({ userId: req.user!.id });
    const consentMap = new Map();
    userConsents.forEach(log => {
      // Keep highest version logged
      const current = consentMap.get(log.pageSlug);
      if (!current || log.version > current) {
        consentMap.set(log.pageSlug, log.version);
      }
    });

    const pending = requiredPages.filter(page => {
      const userVersion = consentMap.get(page.slug);
      return !userVersion || userVersion < page.version;
    }).map(p => ({
      slug: p.slug,
      title: p.title,
      version: p.version
    }));

    res.json({ success: true, pending });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v1/consents
consentsRouter.post('/', requireAuth, async (req, res) => {
  try {
    const { consents } = req.body; // [{ pageSlug, version }]
    if (!Array.isArray(consents)) {
      res.status(400).json({ success: false, message: 'Invalid payload' });
      return;
    }

    const logs = consents.map(c => ({
      userId: req.user!.id,
      pageSlug: c.pageSlug,
      version: c.version,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }));

    await ConsentLog.insertMany(logs);
    res.json({ success: true, message: 'Consents recorded' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
