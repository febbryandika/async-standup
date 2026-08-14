// Better Auth's catch-all handler is wired up in SPEC §13 step 3.
export function GET() {
  return new Response('Not implemented', { status: 501 })
}

export function POST() {
  return new Response('Not implemented', { status: 501 })
}
