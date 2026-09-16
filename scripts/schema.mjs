import { writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { demoSchema } from '../dist/config.js';
import { storySchema } from '../dist/imports.js';
await writeFile('demo.schema.json', JSON.stringify(z.toJSONSchema(demoSchema), null, 2) + '\n');
await writeFile('story.schema.json', JSON.stringify(z.toJSONSchema(storySchema), null, 2) + '\n');
