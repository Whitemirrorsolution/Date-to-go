import { Router, type Request, type Response } from 'express';
import { Page } from '../../models/Page.js';
import { FaqItem } from '../../models/FaqItem.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';

const router: Router = Router();

// ── Pages CMS ──────────────────────────────────────────────────────────────

router.get(
  '/pages',
  asyncHandler(async (_req: Request, res: Response) => {
    const pages = await Page.find().sort({ updatedAt: -1 });
    res.json({ success: true, data: pages });
  })
);

router.get(
  '/pages/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const page = await Page.findOne({ slug: req.params['slug'] });
    if (!page) throw new AppError('Page not found', 404);
    res.json({ success: true, data: page });
  })
);

router.post(
  '/pages',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug, title, subtitle, blocks, requiresConsent } = req.body;
    
    let page = await Page.findOne({ slug });
    if (page) {
      throw new AppError('Page with this slug already exists. Use PUT to update.', 400);
    }
    
    page = await Page.create({
      slug,
      title,
      subtitle,
      blocks: blocks || [],
      requiresConsent: requiresConsent || false,
      status: 'DRAFT',
      version: 1,
    });
    
    res.status(201).json({ success: true, data: page });
  })
);

router.put(
  '/pages/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const { title, subtitle, blocks, requiresConsent, status } = req.body;
    
    const page = await Page.findOne({ slug: req.params['slug'] });
    if (!page) throw new AppError('Page not found', 404);
    
    if (title) page.title = title;
    if (subtitle !== undefined) page.subtitle = subtitle;
    if (blocks) page.blocks = blocks;
    if (requiresConsent !== undefined) page.requiresConsent = requiresConsent;
    
    // If publishing, push to history
    if (status === 'PUBLISHED' && page.status !== 'PUBLISHED') {
      page.status = 'PUBLISHED';
      page.effectiveDate = new Date();
      page.history.push({
        version: page.version,
        blocks: page.blocks,
        publishedBy: req.user!.id as any,
        publishedAt: new Date(),
      });
      page.version += 1;
    } else if (status === 'DRAFT') {
      page.status = 'DRAFT';
    }
    
    await page.save();
    res.json({ success: true, data: page });
  })
);

// ── FAQs CMS ───────────────────────────────────────────────────────────────

router.get(
  '/faqs',
  asyncHandler(async (_req: Request, res: Response) => {
    const faqs = await FaqItem.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: faqs });
  })
);

router.post(
  '/faqs',
  asyncHandler(async (req: Request, res: Response) => {
    const { question, answer, topic, order, isPopular, isActive } = req.body;
    const faq = await FaqItem.create({
      question,
      answer: answer || [],
      topic,
      order: order || 0,
      isPopular: isPopular || false,
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json({ success: true, data: faq });
  })
);

router.put(
  '/faqs/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const faq = await FaqItem.findByIdAndUpdate(req.params['id'], req.body, { new: true });
    if (!faq) throw new AppError('FAQ not found', 404);
    res.json({ success: true, data: faq });
  })
);

router.delete(
  '/faqs/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const faq = await FaqItem.findByIdAndDelete(req.params['id']);
    if (!faq) throw new AppError('FAQ not found', 404);
    res.json({ success: true, message: 'FAQ deleted' });
  })
);

export default router;
