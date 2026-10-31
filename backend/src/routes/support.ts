import { Router } from 'express';
import { CompanySettings } from '../models/CompanySettings.js';
import { FaqItem } from '../models/FaqItem.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { requireAuth } from '../middlewares/auth.js';
import crypto from 'crypto';

export const supportRouter: Router = Router();

// GET /api/v1/support/config
supportRouter.get('/config', async (req, res) => {
  try {
    const settings = await CompanySettings.findOne();
    if (!settings) {
      res.status(404).json({ success: false, message: 'Settings not found' });
      return;
    }

    const publicConfig = {
      supportPhone: settings.supportPhone,
      supportEmail: settings.supportEmail,
      supportHours: settings.supportHours,
      emergencyContacts: settings.emergencyContacts,
      grievanceOfficer: settings.grievanceOfficer
    };

    const hash = crypto.createHash('md5').update(JSON.stringify(publicConfig)).digest('hex');
    if (req.headers['if-none-match'] === hash) {
      res.status(304).end();
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=600');
    res.setHeader('ETag', hash);
    res.json({ success: true, data: publicConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/support/faqs
supportRouter.get('/faqs', async (req, res) => {
  try {
    const { topic, q } = req.query;
    
    let query: any = { isActive: true };
    if (topic) query.topic = topic;
    if (q) query.$text = { $search: q as string };

    const faqs = await FaqItem.find(query).sort({ order: 1 });
    
    const hash = crypto.createHash('md5').update(JSON.stringify(faqs)).digest('hex');
    if (req.headers['if-none-match'] === hash) {
      res.status(304).end();
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=600');
    res.setHeader('ETag', hash);
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// -- Authenticated Ticket Endpoints --

// POST /api/v1/support/tickets
supportRouter.post('/tickets', requireAuth, async (req, res) => {
  try {
    const { subject, category, message, bookingId, attachments } = req.body;
    
    const ticket = new SupportTicket({
      userId: req.user!.id,
      subject,
      category,
      message,
      bookingId,
      attachments: attachments || [],
      messages: [{
        senderId: req.user!.id,
        senderRole: req.user!.roles[0],
        message
      }]
    });

    await ticket.save();
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/support/tickets
supportRouter.get('/tickets', requireAuth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
