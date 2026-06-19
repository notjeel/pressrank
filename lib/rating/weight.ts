// Vote weighting hook (integrity doc §9):
//   weight = identity_trust × behavioral_authenticity × recency
// MVP implements identity_trust from account age; the other factors default to
// 1.0 and are the seams where CIB/anomaly detection plugs in later WITHOUT
// touching the scoring math.

export interface WeightInputs {
  accountCreatedAt: string | null;
  // future: behavioral_authenticity, recency, consistency
}

export function computeVoteWeight(input: WeightInputs): number {
  const identityTrust = identityTrustFromAge(input.accountCreatedAt);
  const behavioralAuthenticity = 1.0; // placeholder for CIB scoring
  const recency = 1.0; // placeholder for time-decay
  return clamp(identityTrust * behavioralAuthenticity * recency, 0, 1);
}

// Newer accounts count for somewhat less; trust ramps to full over ~14 days.
// The floor is deliberately non-trivial (0.5) so genuine early-launch voters
// still move the needle — while month-old farmed accounts gain little edge.
// Tighten the floor later (toward 0.1) once you have volume and add CIB scoring.
function identityTrustFromAge(createdAt: string | null): number {
  const FLOOR = 0.5;
  const RAMP_DAYS = 14;
  if (!createdAt) return FLOOR;
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (days <= 0) return FLOOR;
  if (days >= RAMP_DAYS) return 1.0;
  return FLOOR + (days / RAMP_DAYS) * (1 - FLOOR);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
