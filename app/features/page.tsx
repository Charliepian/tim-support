import type { Metadata } from "next";
import { getFeatures, getFeatureCategories } from "@/lib/wordpress";
import FeatureSidebar from "@/components/features/FeatureSidebar";
import FeatureCard from "@/components/features/FeatureCard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fonctionnalités",
  description: "Découvrez toutes les fonctionnalités de TIM Management — pointage, planning, RH et plus.",
};

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function FeaturesPage({ searchParams }: PageProps) {
  const { category = "" } = await searchParams;

  const [features, categories] = await Promise.all([
    getFeatures({ category: category || undefined }),
    getFeatureCategories(),
  ]);

  // Nom de la catégorie active pour l'affichage
  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Fonctionnalités</h1>
        <p className="mt-1 text-[var(--color-muted)] text-sm">
          {features.length} fonctionnalité{features.length > 1 ? "s" : ""}
          {activeCategory ? ` · ${activeCategory.name}` : ""}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar hiérarchique */}
        <FeatureSidebar categories={categories} />

        {/* Grille */}
        <div className="flex-1 min-w-0">
          {features.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-[var(--color-muted)]">Aucune fonctionnalité dans cette catégorie.</p>
              <a href="/features" className="mt-3 text-sm text-[var(--color-primary)] hover:underline">
                Voir toutes les fonctionnalités
              </a>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {features.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
