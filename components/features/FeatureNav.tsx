import Link from "next/link";

interface NavFeature {
  slug:  string;
  title: string;
}

interface Props {
  prev?: NavFeature;
  next?: NavFeature;
}

export default function FeatureNav({ prev, next }: Props) {
  if (!prev && !next) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 gap-4">

      {/* Précédent */}
      <div>
        {prev && (
          <Link
            href={`/features/${prev.slug}`}
            className="group flex flex-col gap-1 p-4 rounded-lg border border-border hover:bg-surface transition-colors"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Précédent
            </span>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {prev.title}
            </span>
          </Link>
        )}
      </div>

      {/* Suivant */}
      <div className="flex justify-end">
        {next && (
          <Link
            href={`/features/${next.slug}`}
            className="group flex flex-col gap-1 p-4 rounded-lg border border-border hover:bg-surface transition-colors text-right w-full"
          >
            <span className="flex items-center justify-end gap-1.5 text-xs text-muted">
              Suivant
              <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {next.title}
            </span>
          </Link>
        )}
      </div>

    </div>
  );
}
