/**
 * Fixture mode end to end, through main() (1.2.0).
 *
 * The invariants live in the WIRING, not in any pure function: with no api-key the
 * Action must (1) never call the API, (2) render the fixture and post the comment with
 * the banner as its first readable line, (3) set `mode=fixture` and the fixture's counts
 * as outputs, and (4) never fail the job — even at the default `fail-on: high`, even
 * though the fixture's verdict is `high_risk`. Same harness shape as
 * gate_no_false_green.test.ts: mock the boundaries, drive `_completed`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  inputs: {} as Record<string, string>,
  outputs: new Map<string, string>(),
  setFailed: vi.fn(),
  warning: vi.fn(),
  notice: vi.fn(),
  info: vi.fn(),
  upsert: vi.fn(),
  runRegressionCheck: vi.fn(),
  runCallReplay: vi.fn(),
}));

vi.mock('@actions/core', () => ({
  getInput: (name: string) => h.inputs[name] ?? '',
  setSecret: vi.fn(),
  info: h.info,
  notice: h.notice,
  warning: h.warning,
  setFailed: h.setFailed,
  setOutput: (k: string, v: string) => h.outputs.set(k, v),
}));

vi.mock('@actions/github', () => ({
  context: { payload: {}, repo: { owner: 'acme', repo: 'agents' }, sha: 'deadbeef' },
  getOctokit: vi.fn(),
}));

vi.mock('../src/api', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/api')>();
  return {
    ...orig,
    runRegressionCheck: (...a: unknown[]) => h.runRegressionCheck(...a),
    runCallReplay: (...a: unknown[]) => h.runCallReplay(...a),
  };
});

vi.mock('../src/comment', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/comment')>();
  return { ...orig, upsertPrComment: (...a: unknown[]) => h.upsert(...a) };
});

const MARKER = '<!-- decimalai-regression-check-comment -->';

describe('a keyless run', () => {
  beforeEach(() => {
    h.inputs = { 'github-token': 'not-a-real-token-long-enough-to-mask', 'fail-on': 'high', 'behavioral-check': 'real' };
    h.outputs.clear();
    h.setFailed.mockReset();
    h.upsert.mockReset();
    h.runRegressionCheck.mockReset();
    h.runCallReplay.mockReset();
    h.runRegressionCheck.mockImplementation(() => {
      throw new Error('the API must not be called in fixture mode');
    });
    h.runCallReplay.mockImplementation(() => {
      throw new Error('call replay must not run in fixture mode');
    });
  });

  it('renders the fixture, posts the banner first, sets mode=fixture, and cannot fail', async () => {
    const mod = await import('../src/index');
    await mod._completed;

    expect(h.runRegressionCheck).not.toHaveBeenCalled();
    expect(h.runCallReplay).not.toHaveBeenCalled();
    expect(h.setFailed, 'a demo must never red the job, whatever fail-on says').not.toHaveBeenCalled();

    expect(h.outputs.get('mode')).toBe('fixture');
    expect(h.outputs.get('verdict')).toBe('high_risk');
    expect(h.outputs.get('high-risk-count')).toBe('2');
    expect(h.outputs.get('medium-risk-count')).toBe('118');
    expect(h.outputs.get('low-risk-count')).toBe('0');
    expect(h.outputs.get('report-url')).toContain('docs.decimal.ai');

    expect(h.notice).toHaveBeenCalled();
    expect(String(h.notice.mock.calls[0][0])).toMatch(/fixture/i);

    expect(h.upsert).toHaveBeenCalledTimes(1);
    const body = String((h.upsert.mock.calls[0][0] as { body: string }).body);
    const lines = body.split('\n');
    expect(lines[0]).toBe(MARKER);
    expect(lines[1]).toMatch(/^> \*\*Fixture run — sample data, not your traffic\.\*\*/);
    expect(body).toContain('[Demo] support-agent');
    expect(body).toContain('compare_competitors');
    // still no raw HTML after the hidden marker (comment_injection.test.ts' rule)
    expect(body.slice(body.indexOf('-->') + 3)).not.toMatch(/<[a-zA-Z!/]/);
    expect(body).not.toContain('impact-reports/'); // no dead dashboard link
  });
});
