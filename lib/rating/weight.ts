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

// New accounts count for little; trust ramps over ~30 days. This makes freshly
// farmed accounts near-useless without aged, believable history.
function identityTrustFromAge(createdAt: string | null): number {
  if (!createdAt) return 0.1;
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (days <= 0) return 0.1;
  if (days >= 30) return 1.0;
  return 0.1 + (days / 30) * 0.9;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
