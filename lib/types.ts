// ─── Features ────────────────────────────────────────────────────────────────

export type FeatureStatus = 'Disponible' | 'Beta' | 'Prochainement';
export type MediaPosition  = 'Droite' | 'Gauche';

export interface FeatureTerm {
  id:   number;
  name: string;
  slug: string;
}

export type MediaDocItem =
  | { acf_fc_layout: 'img';      img:     WPMedia }
  | { acf_fc_layout: 'galerie';  galerie: WPMedia[] }
  | { acf_fc_layout: 'editeur';  editeur: string }
  | { acf_fc_layout: 'fichier';  fichier: { url: string; filename: string; filesize: number; mime_type: string } };

export interface DocSection {
  title_doc:       string;
  description_doc: string;
  media_doc:       MediaDocItem[];
  media_position:  MediaPosition;
}

export interface FeatureACF {
  title_feature:     string;
  short_description: string;
  status:            FeatureStatus;
  doc:               DocSection[];
}

export interface FeatureFeedback {
  helpful:     number;
  not_helpful: number;
}

export interface Feature {
  id:         number;
  slug:       string;
  title:      string;
  thumbnail:  string | null;
  platforms:  FeatureTerm[];
  categories: FeatureTerm[];
  acf:        FeatureACF;
  feedback:   FeatureFeedback;
  modified:   string;
  content?:   string; // uniquement sur la fiche complète
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  parent: number;
}

export interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  modified: string;
  categories: number[];
  featured_media: number;
  acf?: Record<string, unknown>;
  yoast_head_json?: {
    title?: string;
    description?: string;
    og_image?: { url: string }[];
  };
  _embedded?: {
    "wp:featuredmedia"?: { source_url: string; alt_text: string }[];
    "wp:term"?: WPCategory[][];
  };
}

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
    sizes: Record<string, { source_url: string; width: number; height: number }>;
  };
}

export interface ArticleSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  categories: WPCategory[];
  thumbnail?: string;
}

export interface ArticleFull extends ArticleSummary {
  content: string;
  modified: string;
  seo?: {
    title?: string;
    description?: string;
  };
}
