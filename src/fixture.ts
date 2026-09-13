/**
 * Fixture mode — what the Action renders when no `api-key` is supplied.
 *
 * Until 2026-09-13 `api-key` was required, so a reader could not see this Action's output
 * without creating an account first — against HN's "try it without signup" guideline,
 * console.dev's self-service criterion, and the awesome-list review rule that names
 * "requires any form of signup" as a blocker. In fixture mode the Action skips the API
 * entirely, renders the committed report below (the two-minute demo's seeded agent,
 * captured from a real run), posts the same comment a live run would post with a banner
 * as its first line, and never fails the job. Add an `api-key` and the same workflow
 * runs against the agent's real traces.
 *
 * Rendering is a pure function of the report (comment.ts), which is why this is a
 * substitution of the report object and nothing more.
 */

import raw from '../fixtures/impact_report.json';
import { RegressionCheckResponse } from './api';

export const FIXTURE_DOCS_URL = 'https://docs.decimal.ai/tutorials/two-minute-demo';
export const FIXTURE_SIGNUP_URL = 'https://app.decimal.ai/settings';

/** The captured report, typed. The JSON's `_README` is documentation and is dropped here. */
const { _README: _doc, ...captured } = raw as unknown as RegressionCheckResponse & { _README?: unknown };
void _doc;
export const FIXTURE_REPORT: RegressionCheckResponse = captured as RegressionCheckResponse;

/**
 * A fresh copy of the fixture report. When the caller passed an `agent-name` it is used
 * as the label, so the comment reads as theirs; the data underneath is still the demo's,
 * and the banner says so.
 */
export function fixtureReport(agentName?: string): RegressionCheckResponse {
  const r: RegressionCheckResponse = JSON.parse(JSON.stringify(FIXTURE_REPORT));
  if (agentName) r.agent_name = agentName;
  return r;
}

/**
 * The first human-readable line of a fixture-mode comment (the hidden MARKER stays line 1
 * — comment.ts anchors comment updates on it). "Fixture" and "not your traffic" sit in the
 * first six words, before any truncation in a notification email; the remedy is the literal
 * YAML line to paste. Plain markdown, no HTML: comment_injection.test.ts forbids raw HTML
 * anywhere in the body, and the invariant is worth more than a small-text tag.
 */
export const FIXTURE_BANNER =
  '> **Fixture run — sample data, not your traffic.** No `api-key` was supplied, so this ' +
  'report was rendered from a committed public fixture: the seeded demo agent from the ' +
  `[two-minute demo](${FIXTURE_DOCS_URL}). Add \`api-key: \${{ secrets.DECIMAL_API_KEY }}\` ` +
  `(free key at [app.decimal.ai/settings](${FIXTURE_SIGNUP_URL})) to run it against your own ` +
  'production traces.';
