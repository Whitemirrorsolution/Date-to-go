import { Router } from 'express';
import { Page } from '../models/Page.js';
import { CompanySettings } from '../models/CompanySettings.js';
import crypto from 'crypto';

export const pagesRouter: Router = Router();

// Replace tokens in text like {{company.legalName}}
const resolveTokens = (text: string, settings: any): string => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
    const keys = path.split('.');
    let current = settings;
    for (const key of keys) {
      if (current[key] === undefined) return match;
      current = current[key];
    }
    return current;
  });
};

const resolveBlocks = (blocks: any[], settings: any) => {
  return blocks.map(block => {
    const newBlock = { ...block };
    if (newBlock.text) newBlock.text = resolveTokens(newBlock.text, settings);
    if (newBlock.items) {
      newBlock.items = newBlock.items.map((item: any) => {
        const newItem = { ...item };
        if (newItem.text) newItem.text = resolveTokens(newItem.text, settings);
        if (newItem.lead) newItem.lead = resolveTokens(newItem.lead, settings);
        if (newItem.label) newItem.label = resolveTokens(newItem.label, settings);
        if (newItem.value) newItem.value = resolveTokens(newItem.value, settings);
        return newItem;
      });
    }
    return newBlock;
  });
};

// GET /api/v1/pages
pagesRouter.get('/', async (req, res) => {
  try {
    const pages = await Page.find({ status: 'PUBLISHED' }).select('slug title version updatedAt');
    
    // ETag caching
    const hash = crypto.createHash('md5').update(JSON.stringify(pages)).digest('hex');
    if (req.headers['if-none-match'] === hash) {
      res.status(304).end();
      return;
    }
    
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutes
    res.setHeader('ETag', hash);
    res.json({ success: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v1/pages/:slug
pagesRouter.get('/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, status: 'PUBLISHED' });
    if (!page) {
      res.status(404).json({ success: false, message: 'Page not found' });
      return;
    }

    const settings = await CompanySettings.findOne() || {};

    const resolvedPage = {
      ...page.toObject(),
      blocks: resolveBlocks(page.blocks, settings)
    };

    const hash = crypto.createHash('md5').update(JSON.stringify(resolvedPage)).digest('hex');
    if (req.headers['if-none-match'] === hash) {
      res.status(304).end();
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=600');
    res.setHeader('ETag', hash);
    res.json({ success: true, data: resolvedPage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
