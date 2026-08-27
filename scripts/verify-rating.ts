/**
 * Invariant checks for the rating maths and the launch-window ladder.
 *
 *   npm run verify:rating
 *
 * No database, no network — these are properties the scoring must hold for the
 * leaderboard to mean anything, so they should be cheap enough to run on every
 * change. Exits non-zero on the first broken invariant.
 */
import { normaliseAgainstChance, shrink } from "../lib/rating/engine";
import { rankingTier, config } from "../lib/config";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? "  — " + detail : ""}`);
  }
}

function close(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) <= tol;
}

console.log("\nchance normalisation");
// The whole point of the odds-ratio rescale: performing exactly at chance must
// land on 0.50 no matter what slate shapes produced that chance.
for (const c of [0.1, 1 / 7, 3 / 7, 0.4, 0.5, 0.75, 0.9]) {
  check(
    `at chance ${c.toFixed(3)} maps to 0.50`,
    close(normaliseAgainstChance(c, c), 0.5, 1e-9),
    `got ${normaliseAgainstChance(c, c)}`
  );
}
check(
  "above chance maps above 0.50",
  normaliseAgainstChance(0.6, 3 / 7) > 0.5
);
check(
  "below chance maps below 0.50",
  normaliseAgainstChance(0.3, 3 / 7) < 0.5
);
check(
  "monotone in p",
  normaliseAgainstChance(0.7, 0.4) > normaliseAgainstChance(0.6, 0.4)
);
check(
  "stays inside (0,1)",
  [0.001, 0.5, 0.999].every((p) => {
    const v = normaliseAgainstChance(p, 0.43);
    return v > 0 && v < 1;
  })
);

console.log("\nslate-shape fairness");
// A statement picked 50% of the time in 2-way slates is performing AT chance.
// One picked 50% of the time in 7-way slates (chance 3/7) is performing ABOVE
// it. The old fixed-0.4 prior scored these the same; it must not any more.
const pairwiseAtChance = normaliseAgainstChance(0.5, 0.5);
const topkSameRate = normaliseAgainstChance(0.5, 3 / 7);
check("same raw rate scores higher in the harder slate", topkSameRate > pairwiseAtChance);
check("...and the easy-slate one reads as exactly average", close(pairwiseAtChance, 0.5, 1e-9));

console.log("\nshrinkage");
check(
  "no evidence returns the prior",
  close(shrink(0, 0, 0.43, 5), 0.43, 1e-9)
);
check(
  "thin evidence stays near the prior",
  Math.abs(shrink(2, 2, 0.43, 5) - 0.43) < 0.25,
  `got ${shrink(2, 2, 0.43, 5).toFixed(3)}`
);
check(
  "heavy evidence overrides the prior",
  Math.abs(shrink(900, 1000, 0.43, 5) - 0.9) < 0.02,
  `got ${shrink(900, 1000, 0.43, 5).toFixed(3)}`
);
check(
  "a perfect record shrinks below 1.0",
  shrink(10, 10, 0.43, 5) < 1
);

console.log("\nranking ladder (relaxed below 10k votes, as specified)");
const t0 = rankingTier(0);
const t371 = rankingTier(371);
const t2499 = rankingTier(2_499);
const t2500 = rankingTier(2_500);
const t9999 = rankingTier(9_999);
const t10000 = rankingTier(10_000);

check("0 votes is launch tier", t0.tier === "launch");
check("launch bar is 1 statement / 2 judgements", t0.minStatements === 1 && t0.minExposure === 2);
check("371 votes still launch", t371.tier === "launch" && t371.launchWindow);
check("2,499 votes still launch", t2499.tier === "launch");
check("2,500 votes steps up to growth", t2500.tier === "growth");
check("growth bar is 2 / 4", t2500.minStatements === 2 && t2500.minExposure === 4);
check("9,999 votes is STILL inside the launch window", t9999.launchWindow);
check("9,999 votes bar is still relaxed vs mature", t9999.minExposure < 10);
check("10,000 votes leaves the launch window", !t10000.launchWindow);
check("mature bar is 3 / 10", t10000.minStatements === 3 && t10000.minExposure === 10);
check(
  "bars never loosen as votes grow",
  t0.minStatements <= t2500.minStatements &&
    t2500.minStatements <= t10000.minStatements &&
    t0.minExposure <= t2500.minExposure &&
    t2500.minExposure <= t10000.minExposure
);
check("launch window target is 10,000", config.launchWindowVotes === 10_000);
check(
  "votesToNextTier counts down and clears at maturity",
  t371.votesToNextTier === 2_500 - 371 && t10000.votesToNextTier === null
);

console.log(
  failures === 0
    ? "\nAll rating invariants hold.\n"
    : `\n${failures} invariant(s) FAILED.\n`
);
process.exit(failures === 0 ? 0 : 1);
