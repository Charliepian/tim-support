import type { WPPost, WPCategory, ArticleSummary, ArticleFull, Feature, FeatureTerm } from "./types";

const API_URL =
  process.env.SUPPORT_WP_API_URL ??
  "https://support-tim-management.co/wp-json/wp/v2";

const TIM_API_URL =
  process.env.SUPPORT_WP_API_URL
    ? process.env.SUPPORT_WP_API_URL.replace("/wp/v2", "/tim-support/v1")
    : "https://support-tim-management.co/wp-json/tim-support/v1";

const DEFAULT_REVALIDATE = 3600; // 1h

async function wpFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
  revalidate = DEFAULT_REVALIDATE
): Promise<T | null> {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  );

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn(`WP API ${res.status} on ${url}`);
      return null;
    }

    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`WP API fetch failed on ${url}:`, err);
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSummary(post: WPPost): ArticleSummary {
  const categories =
    post._embedded?.["wp:term"]?.[0]?.filter((t) => !t.parent) ?? [];
  const thumbnail =
    post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

  return {
    id: post.id,
    slug: post.slug,
    title: post.title.rendered,
    excerpt: post.excerpt.rendered.replace(/<[^>]+>/g, "").slice(0, 160),
    date: post.date,
    categories,
    thumbnail,
  };
}

function toFull(post: WPPost): ArticleFull {
  return {
    ...toSummary(post),
    content: post.content.rendered,
    modified: post.modified,
    seo: {
      title: post.yoast_head_json?.title,
      description: post.yoast_head_json?.description,
    },
  };
}

// ─── API publique ────────────────────────────────────────────────────────────

/** Toutes les catégories (exclut parent = 0 si vous avez des sous-catégories) */
export async function getCategories(): Promise<WPCategory[]> {
  const result = await wpFetch<WPCategory[]>("/categories", {
    per_page: 50,
    hide_empty: 1,
    orderby: "count",
    order: "desc",
  });
  return result ?? [];
}

/** Articles récents (page d'accueil) */
export async function getRecentArticles(
  perPage = 12
): Promise<ArticleSummary[]> {
  const posts = await wpFetch<WPPost[]>("/posts", {
    per_page: perPage,
    _embed: "wp:featuredmedia,wp:term",
    orderby: "date",
    order: "desc",
  });
  return (posts ?? []).map(toSummary);
}

/** Articles par catégorie */
export async function getArticlesByCategory(
  categoryId: number,
  perPage = 20,
  page = 1
): Promise<ArticleSummary[]> {
  const posts = await wpFetch<WPPost[]>("/posts", {
    categories: categoryId,
    per_page: perPage,
    page,
    _embed: "wp:featuredmedia,wp:term",
  });
  return (posts ?? []).map(toSummary);
}

/** Article par slug */
export async function getArticleBySlug(
  slug: string
): Promise<ArticleFull | null> {
  const posts = await wpFetch<WPPost[]>("/posts", {
    slug,
    _embed: "wp:featuredmedia,wp:term",
  });
  if (!posts?.length) return null;
  return toFull(posts[0]);
}

/** Recherche plein texte */
export async function searchArticles(
  query: string,
  perPage = 15
): Promise<ArticleSummary[]> {
  if (!query.trim()) return [];
  const posts = await wpFetch<WPPost[]>("/posts", {
    search: query,
    per_page: perPage,
    _embed: "wp:featuredmedia,wp:term",
  });
  return (posts ?? []).map(toSummary);
}

/** Catégorie par slug */
export async function getCategoryBySlug(
  slug: string
): Promise<WPCategory | null> {
  const cats = await wpFetch<WPCategory[]>("/categories", { slug });
  return cats?.[0] ?? null;
}

/** Slugs de tous les articles — retourne [] si l'API est inaccessible */
export async function getAllArticleSlugs(): Promise<string[]> {
  const posts = await wpFetch<WPPost[]>("/posts", {
    per_page: 100,
    fields: "slug",
  });
  return (posts ?? []).map((p) => p.slug);
}

/** Slugs de toutes les catégories */
export async function getAllCategorySlugs(): Promise<string[]> {
  const cats = await getCategories();
  return cats.map((c) => c.slug);
}

// ─── Features ────────────────────────────────────────────────────────────────

async function timFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
  revalidate = DEFAULT_REVALIDATE
): Promise<T | null> {
  const url = new URL(`${TIM_API_URL}${path}`);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  );

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn(`TIM API ${res.status} on ${url}`);
      return null;
    }

    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`TIM API fetch failed on ${url}:`, err);
    return null;
  }
}

/** Toutes les features (avec filtres optionnels plateforme / catégorie) */
export async function getFeatures(opts: {
  platform?: string;
  category?: string;
} = {}): Promise<Feature[]> {
  const params: Record<string, string> = {};
  if (opts.platform) params.platform = opts.platform;
  if (opts.category) params.category = opts.category;

  const result = await timFetch<Feature[]>("/features", params);
  return result ?? [];
}

/** Feature par slug */
export async function getFeatureBySlug(slug: string): Promise<Feature | null> {
  return timFetch<Feature>(`/features/${slug}`);
}

/** Catégories de features (avec filtre plateforme optionnel) */
export async function getFeatureCategories(platform?: string): Promise<FeatureTerm[]> {
  const params: Record<string, string> = {};
  if (platform) params.platform = platform;

  const result = await timFetch<FeatureTerm[]>("/feature-categories", params);
  return result ?? [];
}

/** Plateformes disponibles */
export async function getPlatforms(): Promise<FeatureTerm[]> {
  const result = await timFetch<FeatureTerm[]>("/platforms");
  return result ?? [];
}

/** Slugs de toutes les features — pour generateStaticParams */
export async function getAllFeatureSlugs(): Promise<string[]> {
  const features = await getFeatures();
  return features.map((f) => f.slug);
}

/** Envoie un feedback utilisateur (côté client uniquement) */
export async function submitFeedback(
  postId: number,
  helpful: boolean,
  comment?: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${TIM_API_URL}/feedback`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, helpful, comment }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
