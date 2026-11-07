import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/push-config')({
  server: { handlers: {
    GET: () => new Response(JSON.stringify({
      enabled: Boolean(process.env['VAPID_PUBLIC_KEY'] && process.env['VAPID_PRIVATE_KEY'] && process.env['BLOB_READ_WRITE_TOKEN']),
      publicKey: process.env['VAPID_PUBLIC_KEY'] || null,
    }), {headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}),
  }},
});
