import { formatDateLong } from './date'

/**
 * SPEC §5.5's digest bodies, as pure functions of their arguments: no database,
 * no clock, no environment. The date is a parameter precisely so it cannot be
 * re-derived here — `sendDigests` computes it once from the team's timezone.
 *
 * This module deliberately lives apart from `lib/digest.ts`. That file imports
 * the database and Resend; the `unit` Vitest project has neither, by design, and
 * `lib/db` throws at import when DATABASE_URL is unset. Keeping the builders
 * here is what lets `pnpm test` cover them on a clean clone — and what makes it
 * structurally impossible for /team/digest-preview to reach Resend.
 */

/** The minimum a recipient row has to carry to be rendered. */
export type DigestMember = { userId: string; name: string }

/**
 * Structurally satisfied by a `standups.$inferSelect` row, so callers pass
 * query results straight through. Narrow on purpose: nothing here needs an id,
 * a teamId or a timestamp, and a builder that cannot see them cannot leak them.
 */
export type DigestStandup = {
  userId: string
  yesterday: string
  today: string
  blockers: string | null
}

type DigestEntry = { member: DigestMember; standup: DigestStandup | null }

/** The email's subject, and its <title>, from one place so they cannot drift. */
export function digestSubject(date: string): string {
  return `Team Standup – ${date}`
}

/**
 * Members in the order given — the query sorts by name, so the digest lists
 * people in the same order /team does — each with the standup they posted.
 * A member with no row is the "No update" case, and the reason the join happens
 * here rather than in SQL: it is behaviour worth a unit test.
 */
function pairWithStandups(
  members: readonly DigestMember[],
  standups: readonly DigestStandup[],
): DigestEntry[] {
  const byUser = new Map(standups.map((standup) => [standup.userId, standup]))

  return members.map((member) => ({
    member,
    standup: byUser.get(member.userId) ?? null,
  }))
}

/** Matches components/standup-card.tsx: a blocker is a non-empty blockers field. */
function hasBlockers(
  entry: DigestEntry,
): entry is DigestEntry & { standup: DigestStandup } {
  return Boolean(entry.standup?.blockers)
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Load-bearing, not hygiene. Every value interpolated below is user-authored —
 * team names and standup text — and the output is handed to a mail client and to
 * an iframe on /team/digest-preview. This escape is why that iframe's srcDoc is
 * safe without any sanitiser.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

/**
 * People type lists into these fields, so the newlines are the author's
 * structure. <br /> rather than the `white-space: pre-wrap` the app's cards use:
 * Outlook's rendering of pre-wrap cannot be relied on.
 */
function toHtmlLines(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />')
}

// Inline styles only, and tables for layout: <style> blocks and flexbox are
// what email clients strip or ignore. role="presentation" keeps a screen reader
// from announcing the scaffolding as a data table.
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const INK = '#18181b'
const MUTED = '#52525b'
const RULE = '#e4e4e7'
const ALERT = '#991b1b'

function htmlField(label: string, value: string): string {
  return `<tr>
              <td valign="top" style="width:96px;padding:2px 8px 2px 0;font-size:13px;line-height:20px;color:${MUTED};">${label}:</td>
              <td valign="top" style="padding:2px 0;font-size:14px;line-height:20px;color:${INK};">${toHtmlLines(value)}</td>
            </tr>`
}

function htmlEntry(entry: DigestEntry): string {
  const name = escapeHtml(entry.member.name)

  if (!entry.standup) {
    return `<h3 style="margin:0 0 4px;font-size:15px;line-height:22px;color:${INK};">${name}</h3>
          <p style="margin:0 0 20px;font-size:14px;line-height:20px;color:${MUTED};">No update</p>`
  }

  const { yesterday, today, blockers } = entry.standup

  return `<h3 style="margin:0 0 6px;font-size:15px;line-height:22px;color:${INK};">${name}</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
            ${htmlField('Yesterday', yesterday)}
            ${htmlField('Today', today)}
            ${blockers ? htmlField('Blockers', blockers) : ''}
          </table>`
}

/**
 * SPEC §3.3: blockers get their own section at the top, then one block per
 * member, "No update" for anyone missing. The section is omitted entirely when
 * nobody is blocked rather than rendered empty — an "everything is fine" day
 * should not lead with a heading about problems.
 */
function htmlBlockers(entries: readonly DigestEntry[]): string {
  const blocked = entries.filter(hasBlockers)
  if (blocked.length === 0) return ''

  const rows = blocked
    .map(
      (entry) => `<tr>
              <td style="padding:0 0 12px;font-size:14px;line-height:20px;color:${INK};">
                <strong>${escapeHtml(entry.member.name)}</strong><br />${toHtmlLines(entry.standup.blockers ?? '')}
              </td>
            </tr>`,
    )
    .join('\n            ')

  // The heading's text is the signal, per SPEC §6.2 — the left rule is
  // reinforcement, and the section reads correctly with colour removed.
  return `<h2 style="margin:0 0 12px;font-size:16px;line-height:24px;color:${ALERT};">Blockers</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border-left:3px solid ${ALERT};padding-left:12px;">
            ${rows}
          </table>
          <hr style="margin:16px 0 24px;border:0;border-top:1px solid ${RULE};" />`
}

export function buildDigestHtml(
  teamName: string,
  date: string,
  members: readonly DigestMember[],
  standups: readonly DigestStandup[],
): string {
  const entries = pairWithStandups(members, standups)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(digestSubject(date))}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid ${RULE};border-radius:8px;">
            <tr>
              <td style="padding:24px;font-family:${FONT};">
          <h1 style="margin:0 0 4px;font-size:18px;line-height:26px;color:${INK};">${escapeHtml(teamName)}</h1>
          <p style="margin:0 0 24px;font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(formatDateLong(date))} · ${escapeHtml(date)}</p>
          ${htmlBlockers(entries)}
          <h2 style="margin:0 0 16px;font-size:16px;line-height:24px;color:${INK};">Updates</h2>
          ${entries.map(htmlEntry).join('\n          ')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

/**
 * SPEC §6.2's text alternative, passed as Resend's `text` field so the message
 * is genuinely multipart rather than HTML-only. Same content, same order, so a
 * plain-text client loses the styling and nothing else.
 */

/** Indents a possibly multi-line field under a padded label. */
function textField(label: string, value: string): string {
  const head = `${label}:`.padEnd(11)
  const [first = '', ...rest] = value.split(/\r?\n/)

  return [
    `    ${head}${first}`,
    ...rest.map((line) => `    ${' '.repeat(head.length)}${line}`),
  ].join('\n')
}

function textEntry(entry: DigestEntry): string {
  if (!entry.standup) {
    return `  ${entry.member.name}\n    No update`
  }

  const { yesterday, today, blockers } = entry.standup

  return [
    `  ${entry.member.name}`,
    textField('Yesterday', yesterday),
    textField('Today', today),
    ...(blockers ? [textField('Blockers', blockers)] : []),
  ].join('\n')
}

export function buildDigestText(
  teamName: string,
  date: string,
  members: readonly DigestMember[],
  standups: readonly DigestStandup[],
): string {
  const entries = pairWithStandups(members, standups)
  const blocked = entries.filter(hasBlockers)

  const sections = [`${teamName}\n${formatDateLong(date)} · ${date}`]

  if (blocked.length > 0) {
    sections.push(
      [
        'BLOCKERS',
        ...blocked.map((entry) =>
          [
            `  ${entry.member.name}`,
            ...(entry.standup.blockers ?? '')
              .split(/\r?\n/)
              .map((line) => `    ${line}`),
          ].join('\n'),
        ),
      ].join('\n\n'),
    )
  }

  sections.push(['UPDATES', ...entries.map(textEntry)].join('\n\n'))

  return `${sections.join('\n\n')}\n`
}
