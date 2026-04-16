import type { WPPost, WPCategory, ArticleSummary, ArticleFull } from "./types";

const API_URL =
  process.env.SUPPORT_WP_API_URL ??
  "https://support-tim-management.co/wp-json/wp/v2";

const DEFAULT_REVALIDATE = 3600; // 1h

async function wpFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
  revalidate = DEFAULT_REVALIDATE
): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  );

  const res = await fetch(url.toString(), {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`WP API error ${res.status} on ${url}`);
  }

  return res.json() as Promise<T>;
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
  return wpFetch<WPCategory[]>("/categories", {
    per_page: 50,
    hide_empty: 1,
    orderby: "count",
    order: "desc",
  });
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
  return posts.map(toSummary);
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
  return posts.map(toSummary);
}

/** Article par slug */
export async function getArticleBySlug(
  slug: string
): Promise<ArticleFull | null> {
  const posts = await wpFetch<WPPost[]>("/posts", {
    slug,
    _embed: "wp:featuredmedia,wp:term",
  });
  if (!posts.length) return null;
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
  return posts.map(toSummary);
}

/** Catégorie par slug */
export async function getCategoryBySlug(
  slug: string
): Promise<WPCategory | null> {
  const cats = await wpFetch<WPCategory[]>("/categories", { slug });
  return cats[0] ?? null;
}

/** Slugs de tous les articles (pour generateStaticParams) */
export async function getAllArticleSlugs(): Promise<string[]> {
  const posts = await wpFetch<WPPost[]>("/posts", {
    per_page: 100,
    fields: "slug",
  });
  return posts.map((p) => p.slug);
}

/** Slugs de toutes les catégories */
export async function getAllCategorySlugs(): Promise<string[]> {
  const cats = await getCategories();
  return cats.map((c) => c.slug);
}
