import { type Request, type Response, type NextFunction } from 'express';
import { AppSetting } from '../models/AppSetting.js';

export const requireFeatureFlag = (flag: string) => async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  const setting = await AppSetting.findOne({ key: flag });
  const val = setting?.value as { enabled?: boolean } | undefined;
  if (val?.enabled) {
    return next();
  }
  res.status(403).json({ success: false, message: `Feature ${flag} not enabled` });
};
