// Hand-maintained DB types (a subset; mirrors supabase/migrations).
// Regenerate with `supabase gen types typescript` once the CLI is wired up.

export type Medium = "youtube" | "instagram" | "tv" | "web" | "other";
export type EntityType = "org" | "individual";
export type ContentType =
  | "hardnews"
  | "explainer"
  | "commentary"
  | "satire"
  | "opinion";
export type SlateKind = "pairwise" | "topk";

export interface Channel {
  id: string;
  name: string;
  handle: string | null;
  medium: Medium;
  entity_type: EntityType;
  content_type: ContentType | null;
  language: string | null;
  country: string | null;
  logo_url: string | null;
  youtube_channel_id: string | null;
  official_url: string | null;
  verified: boolean;
  enriched_at: string | null;
  stats_fetched_at: string | null;
  statements_fetched_at: string | null;
  created_at: string;
}

export interface Dimension {
  id: number;
  key: string;
  label: string;
  question: string;
  sort: number;
}

export interface Statement {
  id: string;
  channel_id: string;
  text: string;
  context: string | null;
  source_url: string | null;
  source_ref: string | null;
  content_hash: string;
  harvested_at: string;
  active: boolean;
}

export interface Slate {
  id: string;
  kind: SlateKind;
  dimension_id: number;
  statement_ids: string[];
  max_pick: number;
  created_at: string;
}

export interface ChannelRating {
  channel_id: string;
  dimension_id: number;
  rating: number;
  sigma: number;
  n_statements: number;
  exposure: number;
  ranked: boolean;
  updated_at: string;
}

export interface StatementScore {
  statement_id: string;
  dimension_id: number;
  shown: number;
  selected: number;
  score: number;
  sigma: number;
  updated_at: string;
}
