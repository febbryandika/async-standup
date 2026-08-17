import { sendDigests } from '@/lib/digest'

/**
 * SPEC §5.4's Vercel Cron target, scheduled daily in vercel.json. Vercel injects
 * the Authorization header from CRON_SECRET for its own invocations.
 *
 * No `dynamic` export: Route Handler GETs are uncached by default in Next 16,
 * and reading a request header is a dynamic access besides.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET

  // SPEC §5.4's snippet compares against `Bearer ${process.env.CRON_SECRET}`
  // directly. With the variable unset that template interpolates to the literal
  // 'Bearer undefined', which anyone can send — so a missing secret has to fail
  // closed rather than become a guessable constant.
  if (!secret) {
    console.error('CRON_SECRET is not set — refusing to run the digest')
    return new Response(null, { status: 401 })
  }

  // Plain `!==` rather than crypto.timingSafeEqual: the signal is nanoseconds of
  // comparison behind milliseconds of network jitter, and timingSafeEqual throws
  // on unequal lengths, so the "safe" spelling needs a length check that leaks
  // length anyway. The defence for this secret is its entropy, not its compare.
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    // No body: a 401 that explains itself is a 401 that helps whoever is probing.
    return new Response(null, { status: 401 })
  }

  // 200 even when `failed > 0` — the run itself succeeded, and a non-2xx invites
  // Vercel to treat the invocation as retryable when there is deliberately no
  // retry. A thrown misconfiguration (no RESEND_API_KEY) still becomes a 500.
  return Response.json(await sendDigests())
}
