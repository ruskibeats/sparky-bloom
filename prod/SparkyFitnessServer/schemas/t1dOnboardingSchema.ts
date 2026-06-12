import { z } from 'zod/v4';

export const T1DOnboardingBodySchema = z.object({
  diagnosisType: z.enum([
    'type1',
    'type2',
    'gestational',
    'other',
    'prefer_not_to_say',
  ]),
  diagnosisYear: z.number().int().min(1900).max(2100).optional(),
  insulinDelivery: z.enum(['pump', 'mdi', 'none', 'other']).optional(),
  cgmDevice: z.string().max(128).optional(),
  targetRangeMin: z.number().positive().optional(),
  targetRangeMax: z.number().positive().optional(),
});

export type T1DOnboardingBody = z.infer<typeof T1DOnboardingBodySchema>;
