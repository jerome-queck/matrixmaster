#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const binName = (name) => (isWindows ? `${name}.cmd` : name);
const localBin = (name) => path.join(root, 'node_modules', '.bin', binName(name));

const runCleanGenerated = () => spawnSync(process.execPath, ['scripts/clean-generated.js'], {
  cwd: root,
  shell: isWindows,
  stdio: 'inherit',
});

const stepDefinitions = {
  clean: {
    label: 'Cleaning generated outputs',
    command: process.execPath,
    args: ['scripts/clean-generated.js'],
  },
  workspace: {
    label: 'Checking workspace hygiene',
    command: process.execPath,
    args: ['scripts/check-workspace-hygiene.js'],
  },
  version: {
    label: 'Checking package version metadata',
    command: process.execPath,
    args: ['scripts/check-version.js'],
  },
  calc: {
    label: 'Running calculation tests',
    command: process.execPath,
    args: ['-r', 'ts-node/register', 'tests/calculation.test.ts'],
  },
  vitest: {
    label: 'Running Vitest suites',
    command: localBin('vitest'),
    args: ['run'],
  },
  e2e: {
    label: 'Running Playwright browser workflows',
    command: localBin('playwright'),
    args: ['test'],
  },
  build: {
    label: 'Building web bundle',
    command: localBin('vite'),
    args: ['build'],
  },
  desktop: {
    label: 'Packaging desktop artifacts',
    command: npmCmd,
    args: ['run', 'electron:dist', '--', '--publish=never'],
    beforeRetry: runCleanGenerated,
    retries: 1,
  },
  'release-artifacts': {
    label: 'Checking release artifact metadata',
    command: process.execPath,
    args: ['scripts/check-release-artifacts.js'],
  },
};

const profileDefinitions = [
  ['calc', ['calc'], 'Calculation tests only.'],
  ['vitest', ['vitest'], 'Vitest suites only.'],
  ['ui', ['vitest'], 'Compatibility alias for Vitest UI/persistence suites.'],
  ['unit', ['calc', 'vitest'], 'Fast local confidence: calculation plus Vitest.'],
  ['browser', ['e2e'], 'Playwright browser workflow tests.'],
  ['all', ['calc', 'vitest', 'e2e'], 'All automated test suites without build or packaging.'],
  ['web', ['clean', 'workspace', 'version', 'calc', 'vitest', 'e2e', 'build'], 'Web verification gate.'],
  ['desktop', ['clean', 'desktop', 'release-artifacts'], 'Desktop packaging verification gate.'],
  ['full', ['clean', 'workspace', 'version', 'calc', 'vitest', 'e2e', 'build', 'desktop', 'release-artifacts'], 'Full local verification gate.'],
  ['release', ['clean', 'workspace', 'version', 'calc', 'vitest', 'e2e', 'desktop', 'release-artifacts'], 'Release candidate gate.'],
];

const profiles = new Map(profileDefinitions.map(([name, steps, description]) => [name, { steps, description }]));

const listProfiles = () => profileDefinitions.map(([name]) => name);

const getProfilePlan = (profileName, passthroughArgs = []) => {
  const profile = profiles.get(profileName);
  if (!profile) {
    throw new Error(`Unknown test workflow profile: ${profileName}`);
  }
  const plan = profile.steps.map((stepId) => {
    const step = stepDefinitions[stepId];
    return { id: stepId, ...step, args: [...step.args] };
  });

  if (passthroughArgs.length > 0) {
    if (plan.length !== 1) {
      throw new Error(`Extra arguments are only supported for single-step profiles. Received profile: ${profileName}`);
    }
    plan[0] = { ...plan[0], args: [...plan[0].args, ...passthroughArgs] };
  }

  return plan;
};

const formatCommand = (step) => [step.command, ...step.args].join(' ');

const runCommand = (step) => {
  step.prepare?.();
  return spawnSync(step.command, step.args, {
    cwd: root,
    env: { ...process.env, ...(step.env || {}) },
    shell: isWindows,
    stdio: 'inherit',
  });
};

const runStep = (step, index, total) => {
  console.log(`\n[${index + 1}/${total}] ${step.label}...`);
  const maxAttempts = (step.retries || 0) + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      console.warn(`Retrying ${step.id} (${attempt}/${maxAttempts})...`);
    }

    const result = runCommand(step);

    if (result.error) {
      if (attempt < maxAttempts) {
        console.warn(`Failed to start ${step.id}: ${result.error.message}`);
        step.beforeRetry?.();
        continue;
      }

      console.error(`Failed to start ${step.id}: ${result.error.message}`);
      process.exit(1);
    }

    if (result.status === 0) {
      return;
    }

    if (attempt < maxAttempts) {
      console.warn(`Step failed: ${step.id}`);
      console.warn(`Command: ${formatCommand(step)}`);
      step.beforeRetry?.();
      continue;
    }

    console.error(`Step failed: ${step.id}`);
    console.error(`Command: ${formatCommand(step)}`);
    process.exit(result.status ?? 1);
  }
};

const printProfiles = () => {
  console.log('Matrix Master test workflow profiles:\n');
  for (const [name, , description] of profileDefinitions) {
    console.log(`- ${name}: ${description}`);
  }
};

const runProfile = (profileName, passthroughArgs = []) => {
  const plan = getProfilePlan(profileName, passthroughArgs);
  console.log(`\n== Matrix Master: ${profileName} workflow ==`);
  plan.forEach((step, index) => runStep(step, index, plan.length));
  console.log(`\n${profileName} workflow complete.`);
};

if (require.main === module) {
  const [requested = 'unit', ...passthroughArgs] = process.argv.slice(2);
  if (requested === '--list' || requested === 'list') {
    printProfiles();
    process.exit(0);
  }

  try {
    runProfile(requested, passthroughArgs);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Run `node scripts/test-workflow.js --list` to see available profiles.');
    process.exit(1);
  }
}

module.exports = {
  getProfilePlan,
  listProfiles,
  profiles,
  stepDefinitions,
};
