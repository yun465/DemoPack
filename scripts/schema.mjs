import { writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { demoSchema } from '../dist/config.js';
await writeFile('demo.schema.json', JSON.stringify(z.toJSONSchema(demoSchema), null, 2) + '\n');
