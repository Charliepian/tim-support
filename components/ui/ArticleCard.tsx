import Link from "next/link";
import type { ArticleSummary } from "@/lib/types";

interface ArticleCardProps {
  article: ArticleSummary;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const date = new Date(article.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex flex-col gap-2 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all bg-white"
    >
      {/* Catégories */}
      {article.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.categories.slice(0, 2).map((cat) => (
            <span
              key={cat.id}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]"
            >
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Titre */}
      <h3 className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors leading-snug">
        {article.title}
      </h3>

      {/* Extrait */}
      {article.excerpt && (
        <p className="text-sm text-[var(--color-muted)] line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>
      )}

      {/* Date */}
      <p className="text-xs text-[var(--color-muted)] mt-auto pt-1">{date}</p>
    </Link>
  );
}
