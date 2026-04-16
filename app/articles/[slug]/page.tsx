import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getArticleBySlug,
  getAllArticleSlugs,
  getArticlesByCategory,
} from "@/lib/wordpress";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ArticleCard from "@/components/ui/ArticleCard";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.seo?.title ?? article.title,
    description: article.seo?.description ?? article.excerpt,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const mainCategory = article.categories[0];
  const related = mainCategory
    ? (
        await getArticlesByCategory(mainCategory.id, 4)
      ).filter((a) => a.slug !== slug).slice(0, 3)
    : [];

  const updatedDate = new Date(article.modified).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const breadcrumbItems = [
    ...(mainCategory
      ? [{ label: mainCategory.name, href: `/categories/${mainCategory.slug}` }]
      : []),
    { label: article.title },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex gap-10">
        {/* Contenu principal */}
        <article className="flex-1 min-w-0">
          <Breadcrumb items={breadcrumbItems} />

          <header className="mt-6 mb-8">
            {article.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {article.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] leading-tight">
              {article.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Mis à jour le {updatedDate}
            </p>
          </header>

          {/* Contenu WordPress */}
          <div
            className="wp-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Feedback */}
          <div className="mt-12 pt-6 border-t border-[var(--color-border)] flex items-center gap-4">
            <p className="text-sm text-[var(--color-muted)]">
              Cet article vous a été utile ?
            </p>
            <div className="flex gap-2">
              <button className="text-sm px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition">
                👍 Oui
              </button>
              <button className="text-sm px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition">
                👎 Non
              </button>
            </div>
          </div>
        </article>

        {/* Sidebar — articles liés */}
        {related.length > 0 && (
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">
                Articles liés
              </h2>
              <div className="flex flex-col gap-3">
                {related.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
