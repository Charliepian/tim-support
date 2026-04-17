import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFeatureBySlug, getAllFeatureSlugs } from "@/lib/wordpress";
import Breadcrumb from "@/components/ui/Breadcrumb";
import StatusBadge from "@/components/features/StatusBadge";
import DocSection from "@/components/features/DocSection";
import FeedbackWidget from "@/components/features/FeedbackWidget";
import { SetActiveCategory } from "@/app/features/active-category-context";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllFeatureSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = await getFeatureBySlug(slug);
  if (!feature) return {};

  const description = feature.acf?.short_description
    ? feature.acf.short_description.replace(/<[^>]+>/g, "").slice(0, 160)
    : undefined;

  return {
    title: feature.acf?.title_feature || feature.title,
    description,
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = await getFeatureBySlug(slug);
  if (!feature) notFound();

  const mainCategory = feature.categories[0];
  const updatedDate  = new Date(feature.modified).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const breadcrumb = [
    { label: "Fonctionnalités", href: "/features" },
    ...(mainCategory ? [{ label: mainCategory.name, href: `/features?category=${mainCategory.slug}` }] : []),
    { label: feature.acf?.title_feature || feature.title },
  ];

  const sections = feature.acf?.doc ?? [];

  return (
    <div className="max-w-5xl px-8 py-8">
      {feature.categories.length > 0 && (
        <SetActiveCategory slugs={feature.categories.map((c) => c.slug)} />
      )}
      <Breadcrumb items={breadcrumb} />

      {/* En-tête */}
      <header className="mt-6 mb-8">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {feature.acf?.status && <StatusBadge status={feature.acf.status} />}
          {feature.platforms.map((p) => (
            <span
              key={p.id}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-absence-bg text-absence border border-absence/30"
            >
              {p.name}
            </span>
          ))}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
          {feature.acf?.title_feature || feature.title}
        </h1>

        <p className="mt-2 text-xs text-muted">
          Mis à jour le {updatedDate}
        </p>

        {/* Description courte */}
        {feature.acf?.short_description && (
          <div
            className="mt-4 text-muted leading-relaxed wp-content"
            dangerouslySetInnerHTML={{ __html: feature.acf.short_description }}
          />
        )}
      </header>

      {/* Séparateur */}
      {sections.length > 0 && (
        <div className="border-t border-border" />
      )}

      {/* Sections doc */}
      {sections.map((section, i) => (
        <DocSection key={i} section={section} index={i} />
      ))}

      {/* Feedback */}
      <FeedbackWidget postId={feature.id} />
    </div>
  );
}
