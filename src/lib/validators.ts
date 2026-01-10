import { z } from 'zod';

export const socialLinkSchema = z.string().url('Must be a valid URL');

export const creatorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  socialLinks: z.array(z.string().url('Must be a valid URL')).min(1, 'At least one social link required'),
});

export const batchSchema = z.object({
  name: z.string().min(1, 'Batch name is required').max(200),
  searchTerms: z.array(z.string().max(50)).optional(),
  userEmail: z.string().email().optional(),
  clientName: z.string().max(200).optional(),
  language: z.enum(['en', 'de']).optional().default('en'),
  // Brand partnership analysis settings
  monthsBack: z.number().min(1).max(36).optional(),
  clientBrand: z.string().max(200).optional(),
  creators: z.array(creatorSchema).min(1, 'At least one creator required'),
});

export const searchTermSchema = z
  .string()
  .min(2, 'Search term too short')
  .max(50, 'Search term too long');

export type CreatorInput = z.infer<typeof creatorSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
