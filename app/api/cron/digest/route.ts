// Vercel Cron target. Implemented in SPEC §13 step 8, guarded by CRON_SECRET.
export function GET() {
  return new Response('Not implemented', { status: 501 })
}
