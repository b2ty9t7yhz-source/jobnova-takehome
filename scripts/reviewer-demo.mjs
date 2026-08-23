import { spawnSync } from "node:child_process";

const steps = [
  {
    name: "Static checks, unit tests, and production builds",
    args: ["run", "check"],
  },
  {
    name: "Browser-backed Indeed workflow tests",
    args: ["run", "test:browser"],
  },
  {
    name: "Desktop and mobile frontend E2E",
    args: ["run", "test:e2e:web"],
  },
  {
    name: "Seed all five application states",
    args: ["run", "demo:seed"],
  },
  {
    name: "Read the persisted status ledger",
    args: ["run", "demo:status"],
  },
  {
    name: "Encrypted Session Vault round trip",
    args: ["run", "demo:session"],
  },
  {
    name: "Safe browser workflow to final review",
    args: ["run", "demo:workflow"],
  },
];

const results = [];

console.log("\nJobNova reviewer demo");
console.log("=====================");
console.log("Synthetic data only. No live Indeed request or submission is performed.\n");

for (const [index, step] of steps.entries()) {
  console.log(`\n[${index + 1}/${steps.length}] ${step.name}`);
  console.log("-".repeat(72));
  const result = spawnSync("npm", step.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  const passed = result.status === 0;
  results.push({ name: step.name, passed });
  if (!passed) break;
}

console.log("\nReviewer evidence summary");
console.log("===========================");
for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`);
}

const omitted = steps.slice(results.length);
for (const step of omitted) console.log(`SKIP  ${step.name}`);

const passed = results.length === steps.length && results.every((result) => result.passed);
console.log("\nSafety: synthetic fixtures, intercepted browser traffic, zero submit requests.");
console.log(passed ? "RESULT: PASS — reviewer path completed." : "RESULT: FAIL — see the first failed step above.");
process.exitCode = passed ? 0 : 1;
