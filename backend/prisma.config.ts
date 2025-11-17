import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  engine: 'classic',
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
