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
      className="group flex flex-col gap-2 p-4 rounded-lg border border-border hover:border-[#b4b4b4] hover:shadow-sm transition-all bg-white"
    >
      {/* Catégories */}
      {article.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.categories.slice(0, 2).map((cat) => (
            <span
              key={cat.id}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-absence-bg text-absence border border-absence/30"
            >
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Titre */}
      <h3 className="font-semibold text-foreground group-hover:text-foreground transition-colors leading-snug">
        {article.title}
      </h3>

      {/* Extrait */}
      {article.excerpt && (
        <p className="text-sm text-muted line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>
      )}

      {/* Date */}
      <p className="text-xs text-muted mt-auto pt-1">{date}</p>
    </Link>
  );
}
