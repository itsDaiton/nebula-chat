import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { dump } from 'js-yaml';
import { openApiDocument } from '@backend/openapi';

const outputDir = resolve(process.cwd(), '../openapi');
const outputPath = resolve(outputDir, 'openapi.yaml');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, dump(openApiDocument, { indent: 2 }));

process.stdout.write(`OpenAPI spec written to ${outputPath}\n`);
