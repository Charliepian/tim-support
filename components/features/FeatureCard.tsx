import Link from "next/link";
import Image from "next/image";
import type { Feature } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import { isFeatureRecent } from "@/lib/feature-utils";

export default function FeatureCard({ feature }: { feature: Feature }) {
  const excerpt = feature.acf?.short_description
    ? feature.acf.short_description.replace(/<[^>]+>/g, "").slice(0, 120)
    : "";

  const isNew = isFeatureRecent(feature.date);

  return (
    <Link
      href={`/features/${feature.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-white hover:border-[#b4b4b4] hover:shadow-sm transition-all overflow-hidden relative"
    >
      {/* Badge "Nouveauté" — visible uniquement < 30 jours après création.
          Positionné en absolu en haut-droite pour rester visible même si la
          carte n'a pas de thumbnail. Violet doux (--color-unavailable). */}
      {isNew && (
        <span className="absolute top-2 right-2 z-10 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-unavailable-bg text-unavailable border border-unavailable/30 backdrop-blur-sm">
          Nouveauté
        </span>
      )}

      {/* Thumbnail */}
      {feature.thumbnail && (
        <div className="relative aspect-video overflow-hidden bg-surface">
          <Image
            src={feature.thumbnail}
            alt={feature.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {feature.acf?.status && (
            <StatusBadge status={feature.acf.status} />
          )}
          {feature.platforms.map((p) => (
            <span
              key={p.id}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-absence-bg text-absence border border-absence/30"
            >
              {p.name}
            </span>
          ))}
        </div>

        {/* Titre */}
        <h3 className="font-semibold text-foreground group-hover:text-foreground transition-colors leading-snug">
          {feature.acf?.title_feature || feature.title}
        </h3>

        {/* Extrait */}
        {excerpt && (
          <p className="text-sm text-muted line-clamp-2 leading-relaxed">
            {excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}
