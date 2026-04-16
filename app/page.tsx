import { getCategories, getRecentArticles } from "@/lib/wordpress";
import ArticleCard from "@/components/ui/ArticleCard";
import SearchBar from "@/components/ui/SearchBar";
import Link from "next/link";

export const revalidate = 3600;

// Icônes par catégorie (à adapter selon vos catégories WP)
const CATEGORY_ICONS: Record<string, string> = {
  pointage: "⏱️",
  planning: "📅",
  "feuille-d-heures": "📋",
  employes: "👷",
  chantiers: "🏗️",
  factures: "🧾",
  vehicules: "🚛",
  engins: "🚜",
  parametres: "⚙️",
  mobile: "📱",
  default: "📄",
};

export default async function HomePage() {
  const [categories, recentArticles] = await Promise.all([
    getCategories(),
    getRecentArticles(6),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--color-primary-light)] to-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text)]">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-[var(--color-muted)] text-lg">
            Guides, tutoriels et réponses à toutes vos questions sur TIM Management.
          </p>
          <SearchBar />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-14">
        {/* Catégories */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-6">
              Parcourir par thème
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categories.map((cat) => {
                const icon =
                  CATEGORY_ICONS[cat.slug] ?? CATEGORY_ICONS.default;
                return (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all bg-white text-center group"
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      {cat.name}
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {cat.count} article{cat.count > 1 ? "s" : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Articles récents */}
        {recentArticles.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-6">
              Articles récents
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        {/* CTA contact */}
        <section className="rounded-[var(--radius-lg)] bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20 p-8 text-center space-y-3">
          <h2 className="font-semibold text-[var(--color-text)]">
            Vous n&apos;avez pas trouvé votre réponse ?
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Notre équipe est disponible pour vous accompagner.
          </p>
          <a
            href="https://tim-management.co/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition"
          >
            Contacter le support
          </a>
        </section>
      </div>
    </>
  );
}
