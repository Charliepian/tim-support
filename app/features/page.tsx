import type { Metadata } from "next";
import { getFeatures, getFeatureCategories, getPlatforms } from "@/lib/wordpress";
import FeatureSidebar from "@/components/features/FeatureSidebar";
import FeatureCard from "@/components/features/FeatureCard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fonctionnalités",
  description: "Découvrez toutes les fonctionnalités de TIM Management — pointage, planning, RH et plus.",
};

interface PageProps {
  searchParams: Promise<{ platform?: string; category?: string }>;
}

export default async function FeaturesPage({ searchParams }: PageProps) {
  const { platform = "", category = "" } = await searchParams;

  const [features, categories, platforms] = await Promise.all([
    getFeatures({ platform: platform || undefined, category: category || undefined }),
    getFeatureCategories(platform || undefined),
    getPlatforms(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Fonctionnalités</h1>
        <p className="mt-1 text-[var(--color-muted)] text-sm">
          {features.length} fonctionnalité{features.length > 1 ? "s" : ""}
          {platform ? ` · ${platforms.find((p) => p.slug === platform)?.name ?? platform}` : ""}
          {category ? ` · ${categories.find((c) => c.slug === category)?.name ?? category}` : ""}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <FeatureSidebar
          platforms={platforms}
          categories={categories}
          currentPlatform={platform}
          currentCategory={category}
        />

        {/* Grille */}
        <div className="flex-1 min-w-0">
          {features.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[var(--color-muted)]">Aucune fonctionnalité trouvée.</p>
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
