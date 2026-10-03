import { env } from 'cloudflare:workers';
export function getDb(): D1Database { if (!env.DB) throw new Error('Task storage is unavailable.'); return env.DB; }
