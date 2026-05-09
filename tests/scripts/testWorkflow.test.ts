import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { getProfilePlan, listProfiles } = require('../../scripts/test-workflow.js') as {
  getProfilePlan: (name: string, passthroughArgs?: string[]) => { id: string; args: string[]; retries?: number }[];
  listProfiles: () => string[];
};

const idsFor = (profile: string) => getProfilePlan(profile).map((step) => step.id);

describe('test workflow profiles', () => {
  it('keeps unit testing as the fast calculation plus Vitest gate', () => {
    expect(idsFor('unit')).toEqual(['calc', 'vitest']);
    expect(idsFor('calc')).toEqual(['calc']);
    expect(idsFor('ui')).toEqual(['vitest']);
  });

  it('builds browser and all-test profiles from reusable lanes', () => {
    expect(idsFor('browser')).toEqual(['e2e']);
    expect(idsFor('all')).toEqual(['calc', 'vitest', 'e2e']);
  });

  it('keeps verification and release profiles ordered around the shared lanes', () => {
    expect(idsFor('web')).toEqual(['clean', 'workspace', 'version', 'calc', 'vitest', 'e2e', 'build']);
    expect(idsFor('desktop')).toEqual(['clean', 'desktop', 'release-artifacts']);
    expect(idsFor('full')).toEqual([
      'clean',
      'workspace',
      'version',
      'calc',
      'vitest',
      'e2e',
      'build',
      'desktop',
      'release-artifacts',
    ]);
    expect(idsFor('release')).toEqual([
      'clean',
      'workspace',
      'version',
      'calc',
      'vitest',
      'e2e',
      'desktop',
      'release-artifacts',
    ]);
  });

  it('exposes the canonical profiles for documentation and help output', () => {
    expect(listProfiles()).toEqual(['calc', 'vitest', 'ui', 'unit', 'browser', 'all', 'web', 'desktop', 'full', 'release']);
  });

  it('passes extra CLI arguments through to single-lane test profiles', () => {
    expect(getProfilePlan('vitest', ['tests/scripts/testWorkflow.test.ts'])[0].args).toEqual([
      'run',
      'tests/scripts/testWorkflow.test.ts',
    ]);
    expect(getProfilePlan('browser', ['--headed'])[0].args).toEqual(['test', '--headed']);
  });

  it('retries desktop packaging once because Electron Builder helpers can fail transiently', () => {
    const desktopStep = getProfilePlan('desktop').find((step) => step.id === 'desktop');

    expect(desktopStep?.retries).toBe(1);
  });
});
