import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildDigestHtml,
  buildDigestText,
  type DigestMember,
  type DigestStandup,
} from '@/lib/digest-html'

const TEAM = 'Kaizen Works'
const DATE = '2026-08-17'

// Mirrors the seed: six members, sorted by name as the query returns them.
const MEMBERS: DigestMember[] = [
  { userId: 'u-haruto', name: 'Haruto Ishikawa' },
  { userId: 'u-lena', name: 'Lena Fischer' },
  { userId: 'u-mika', name: 'Mika Sato' },
  { userId: 'u-priya', name: 'Priya Raman' },
  { userId: 'u-ren', name: 'Ren Takahashi' },
  { userId: 'u-tomas', name: 'Tomás Ferreira' },
]

const BLOCKER = 'Waiting on the staging DB credentials.'

// The seed's deliberate gaps, in miniature: Priya is blocked, and Ren has never
// posted — so `standups` is one row shorter than `members`, which is the whole
// reason the pairing happens in the builder rather than in SQL.
const STANDUPS: DigestStandup[] = [
  {
    userId: 'u-haruto',
    yesterday: 'Reviewed the onboarding flow.',
    today: 'Invite-code regeneration.',
    blockers: null,
  },
  {
    userId: 'u-lena',
    yesterday: 'Wired the invite-code form.',
    today: 'Cursor pagination on /history.\nThen the digest builder.',
    blockers: null,
  },
  {
    userId: 'u-mika',
    yesterday: 'Timezone handling on the standup form.',
    today: 'Team feed empty states.',
    blockers: null,
  },
  {
    userId: 'u-priya',
    yesterday: 'Tried to deploy the preview branch.',
    today: 'Blocked, picking up docs instead.',
    blockers: BLOCKER,
  },
  {
    userId: 'u-tomas',
    yesterday: 'Badge contrast fixes.',
    today: 'Keyboard path through the form.',
    blockers: null,
  },
]

const HTML = buildDigestHtml(TEAM, DATE, MEMBERS, STANDUPS)
const TEXT = buildDigestText(TEAM, DATE, MEMBERS, STANDUPS)

const UNBLOCKED = STANDUPS.map((standup) => ({ ...standup, blockers: null }))

// SPEC §12 — every member appears, missing ones are marked, blockers surface.
describe('buildDigestHtml', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each(MEMBERS)('includes $name', (member) => {
    expect(HTML).toContain(`${member.name}</h3>`)
  })

  it('renders each member exactly once, in the order it was given', () => {
    // The query sorts; the builder does not re-sort. Asserting the whole
    // sequence catches a duplicated block as well as a reordered one — and a
    // blocked member appearing twice would be a real bug, since Priya is also
    // named in the blockers section above.
    const headings = HTML.split('<h3')
      .slice(1)
      .map(
        (block) => MEMBERS.find((member) => block.includes(member.name))?.name,
      )

    expect(headings).toEqual(MEMBERS.map((member) => member.name))
  })

  it('marks the member with no standup as "No update"', () => {
    // Exactly one, and positioned inside Ren's block rather than merely present
    // somewhere in the document.
    expect(HTML.match(/No update/g)).toHaveLength(1)

    const noUpdate = HTML.indexOf('No update')
    expect(noUpdate).toBeGreaterThan(HTML.indexOf('Ren Takahashi'))
    expect(noUpdate).toBeLessThan(HTML.indexOf('Tomás Ferreira'))
  })

  it('surfaces blockers in their own section, above the updates', () => {
    const blockersHeading = HTML.indexOf('Blockers</h2>')
    const updatesHeading = HTML.indexOf('Updates</h2>')

    expect(blockersHeading).toBeGreaterThanOrEqual(0)
    // SPEC §3.3 puts the section first. Asserting order, not just presence: a
    // blockers block rendered after the member list would still "contain" it.
    expect(blockersHeading).toBeLessThan(updatesHeading)
    expect(HTML.indexOf(BLOCKER)).toBeLessThan(updatesHeading)
  })

  it('omits the blockers section entirely when nobody is blocked', () => {
    const html = buildDigestHtml(TEAM, DATE, MEMBERS, UNBLOCKED)

    expect(html).not.toContain('Blockers</h2>')
    expect(html).not.toContain('Blockers:')
    expect(html).toContain('Updates</h2>')
  })

  it('keeps the line breaks a member typed', () => {
    expect(HTML).toContain(
      'Cursor pagination on /history.<br />Then the digest builder.',
    )
  })

  it('escapes every value it interpolates', () => {
    // This is what makes the preview page's iframe srcDoc safe without a
    // sanitiser, so it is asserted on the tag delimiters rather than on the
    // payload: escaped, `onerror=` survives as harmless text, `<img` does not.
    const html = buildDigestHtml(
      '<img src=x onerror=alert(1)>',
      DATE,
      [{ userId: 'u-mika', name: "O'Brien & <em>Co</em>" }],
      [
        {
          userId: 'u-mika',
          yesterday: '<script>alert(1)</script>',
          today: 'shipped a & b',
          blockers: '"quoted"',
        },
      ],
    )

    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<em>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('O&#39;Brien &amp; &lt;em&gt;Co&lt;/em&gt;')
    expect(html).toContain('shipped a &amp; b')
    expect(html).toContain('&quot;quoted&quot;')
  })

  it('declares utf-8, so a name like Tomás survives the mail client', () => {
    expect(HTML).toContain('<meta charset="utf-8" />')
    expect(HTML).toContain('Tomás Ferreira')
  })

  it('renders the date it was given, not today', () => {
    const html = buildDigestHtml(TEAM, '2024-03-01', MEMBERS, STANDUPS)

    expect(html).toContain('2024-03-01')
    expect(html).not.toContain(DATE)
  })

  it('never reads the clock', () => {
    // Why `date` is a parameter and not derived: /team/digest-preview renders
    // past dates, and a builder that consulted the clock would drift toward
    // today. HTML above was built under real timers, so matching it under two
    // wildly different fake ones is the proof.
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'))
    const early = buildDigestHtml(TEAM, DATE, MEMBERS, STANDUPS)

    vi.setSystemTime(new Date('2031-12-31T23:59:59Z'))
    const late = buildDigestHtml(TEAM, DATE, MEMBERS, STANDUPS)

    expect(early).toBe(HTML)
    expect(late).toBe(HTML)
  })
})

// SPEC §6.2 — the digest has to be readable in a plain-text client.
describe('buildDigestText', () => {
  it.each(MEMBERS)('includes $name', (member) => {
    expect(TEXT).toContain(member.name)
  })

  it('contains no markup at all', () => {
    expect(TEXT).not.toMatch(/<[a-z/!]/i)
    expect(TEXT).not.toContain('&amp;')
  })

  it("keeps an author's literal characters", () => {
    // The deliberate opposite of the HTML part, and the reason this is a second
    // builder rather than a regex over the first: this string is text/plain, so
    // escaping it would show a reader '&lt;' where they typed '<'.
    const text = buildDigestText(TEAM, DATE, MEMBERS, [
      {
        userId: 'u-mika',
        yesterday: '<script>alert(1)</script>',
        today: 'shipped a & b',
        blockers: `"quoted" O'Brien`,
      },
    ])

    expect(text).toContain('<script>alert(1)</script>')
    expect(text).toContain('shipped a & b')
    expect(text).toContain(`"quoted" O'Brien`)
  })

  it('marks the member with no standup as "No update"', () => {
    expect(TEXT).toContain('  Ren Takahashi\n    No update')
  })

  it('surfaces blockers above the updates', () => {
    const blockers = TEXT.indexOf('BLOCKERS')
    const updates = TEXT.indexOf('UPDATES')

    expect(blockers).toBeGreaterThanOrEqual(0)
    expect(blockers).toBeLessThan(updates)
    expect(TEXT.indexOf(BLOCKER)).toBeLessThan(updates)
  })

  it('omits the blockers section entirely when nobody is blocked', () => {
    expect(buildDigestText(TEAM, DATE, MEMBERS, UNBLOCKED)).not.toContain(
      'BLOCKERS',
    )
  })

  it('indents the continuation of a multi-line field under its label', () => {
    expect(TEXT).toContain(
      `    Today:     Cursor pagination on /history.\n${' '.repeat(15)}Then the digest builder.`,
    )
  })
})
