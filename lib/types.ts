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
