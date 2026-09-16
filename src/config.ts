import { z } from 'zod';

const dimension = z
  .number()
  .int()
  .min(320)
  .max(1920)
  .refine((n) => n % 2 === 0, 'Must be even');
const common = {
  caption: z.string().min(1).max(140),
  holdMs: z.number().int().min(200).max(30000).default(2500),
  zoom: z.number().min(1).max(1.5).default(1),
  focus: z.string().min(1).optional(),
  screenshot: z.boolean().default(false),
};
export const releaseSchema = z.strictObject({
  short: z.strictObject({
    steps: z.array(z.number().int().min(1)).min(1).max(12),
    secondsPerStep: z.number().min(1).max(10).default(4),
  }),
  social: z.strictObject({
    secondsPerCard: z.number().min(3).max(15).default(6),
    cards: z
      .array(
        z.strictObject({
          step: z.number().int().min(1),
          title: z.string().min(1).max(44),
          body: z.string().min(1).max(100),
        }),
      )
      .min(1)
      .max(8),
  }),
  project: z.strictObject({
    summary: z.string().min(1).max(800),
    sections: z
      .array(
        z.strictObject({
          heading: z.string().min(1).max(80),
          body: z.string().min(1).max(4000),
        }),
      )
      .min(1)
      .max(12),
  }),
  socialCaption: z.string().max(5000).optional(),
});
export type Release = z.infer<typeof releaseSchema>;
export const demoSchema = z
  .strictObject({
    $schema: z.string().optional(),
    title: z.string().min(1).max(70),
    url: z.string().min(1),
    release: releaseSchema.optional(),
    viewport: z
      .strictObject({ width: dimension, height: dimension })
      .default({ width: 960, height: 540 }),
    timeoutMs: z.number().int().min(100).max(60000).default(10000),
    captureFps: z.number().int().min(4).max(15).default(10),
    gif: z
      .strictObject({
        width: z.number().int().min(320).max(960).default(640),
        fps: z.number().int().min(4).max(15).default(8),
        seconds: z.number().min(1).max(30).default(12),
        start: z.number().min(0).default(0),
      })
      .default({ width: 640, fps: 8, seconds: 12, start: 0 }),
    theme: z
      .strictObject({
        background: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default('#101c2d'),
        accent: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default('#54e0bb'),
        padding: z
          .number()
          .int()
          .min(16)
          .max(80)
          .refine((n) => n % 2 === 0)
          .default(32),
      })
      .default({ background: '#101c2d', accent: '#54e0bb', padding: 32 }),
    steps: z
      .array(
        z.discriminatedUnion('action', [
          z.strictObject({
            ...common,
            action: z.literal('open'),
            url: z.string().min(1).optional(),
          }),
          z.strictObject({ ...common, action: z.literal('click'), selector: z.string().min(1) }),
          z.strictObject({
            ...common,
            action: z.literal('press'),
            selector: z.string().min(1),
            key: z.enum([
              'Enter',
              'Tab',
              'Escape',
              'Backspace',
              'Delete',
              'ArrowUp',
              'ArrowDown',
              'ArrowLeft',
              'ArrowRight',
              'Space',
            ]),
          }),
          z.strictObject({
            ...common,
            action: z.literal('fill'),
            selector: z.string().min(1),
            value: z.string().max(2000),
          }),
          z
            .strictObject({
              ...common,
              action: z.literal('wait'),
              selector: z.string().min(1).optional(),
              text: z.string().min(1).optional(),
              ms: z.number().int().min(0).max(30000).optional(),
            })
            .refine(
              (s) => s.selector || s.text || s.ms !== undefined,
              'wait needs selector, text or ms',
            ),
          z.strictObject({ ...common, action: z.literal('screenshot') }),
        ]),
      )
      .min(1)
      .max(60),
  })
  .superRefine((demo, ctx) => {
    if (!demo.release) return;
    const seen = new Set<number>();
    demo.release.short.steps.forEach((step, i) => {
      if (step > demo.steps.length || seen.has(step))
        ctx.addIssue({
          code: 'custom',
          path: ['release', 'short', 'steps', i],
          message: 'Step must exist and must not repeat',
        });
      seen.add(step);
    });
    demo.release.social.cards.forEach((card, i) => {
      if (card.step > demo.steps.length)
        ctx.addIssue({
          code: 'custom',
          path: ['release', 'social', 'cards', i, 'step'],
          message: 'Step must exist',
        });
    });
  });
export type Demo = z.infer<typeof demoSchema>;
export function parseDemo(value: unknown): Demo {
  return demoSchema.parse(value);
}
