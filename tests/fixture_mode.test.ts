/**
 * Fixture mode at the input boundary (1.2.0).
 *
 * `api-key` is optional now: absent means fixture mode, in which `agent-name` and
 * `candidate-manifest-id` are not required either. But relaxing one input must not relax
 * the live run — a key with no agent-name, or no discoverable manifest, is still the loud
 * misconfiguration it always was, and every enum input is validated in both modes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseInputs } from '../src/inputs';

// See inputs.test.ts: parseInputs calls the real core.setSecret, and a short literal
// would be masked across the whole public CI log.
const MASKABLE_FIXTURE = 'not-a-real-credential-just-long-enough-to-mask';

const saved: Record<string, string | undefined> = {};
function setInput(name: string, val: string) {
  const key = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  if (!(key in saved)) saved[key] = process.env[key];
  process.env[key] = val;
}
function clearInput(name: string) {
  const key = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  if (!(key in saved)) saved[key] = process.env[key];
  delete process.env[key];
}

let savedGhOutput: string | undefined;
beforeEach(() => {
  savedGhOutput = process.env.GITHUB_OUTPUT;
  delete process.env.GITHUB_OUTPUT;
  for (const n of ['api-key', 'agent-name', 'candidate-manifest-id', 'fail-on', 'on-error', 'base-url']) clearInput(n);
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  if (savedGhOutput !== undefined) process.env.GITHUB_OUTPUT = savedGhOutput;
});

describe('fixture mode is decided by the absence of api-key', () => {
  it('no api-key: fixture mode, and neither agent-name nor a manifest id is required', () => {
    const inputs = parseInputs();
    expect(inputs.fixtureMode).toBe(true);
    expect(inputs.apiKey).toBe('');
    expect(inputs.agentName).toBe('');
    expect(inputs.candidateManifestId).toBe('');
    // the defaults still resolve, so the rest of the run is configured normally
    expect(inputs.failOn).toBe('high');
    expect(inputs.onError).toBe('warn');
    expect(inputs.baseUrl).toBe('https://api.decimal.ai');
  });

  it('an agent-name given in fixture mode is carried as the label', () => {
    setInput('agent-name', 'my-agent');
    expect(parseInputs().agentName).toBe('my-agent');
  });

  it('a key with no agent-name is still fatal and names the input', () => {
    setInput('api-key', MASKABLE_FIXTURE);
    expect(() => parseInputs()).toThrow(/agent-name/);
  });

  it('a key with an agent-name but no discoverable manifest is still fatal', () => {
    setInput('api-key', MASKABLE_FIXTURE);
    setInput('agent-name', 'my-agent');
    expect(() => parseInputs()).toThrow(/candidate-manifest-id/);
  });

  it('a live run with everything supplied is not fixture mode', () => {
    setInput('api-key', MASKABLE_FIXTURE);
    setInput('agent-name', 'my-agent');
    setInput('candidate-manifest-id', 'mfst_1');
    const inputs = parseInputs();
    expect(inputs.fixtureMode).toBe(false);
    expect(inputs.candidateManifestId).toBe('mfst_1');
  });

  it('a typo in an enum input is fatal in fixture mode too', () => {
    setInput('fail-on', 'sometimes');
    expect(() => parseInputs()).toThrow(/fail-on/);
  });
});
