import Image from "next/image";
import type { DocSection as DocSectionType, MediaDocItem } from "@/lib/types";

function MediaBlock({ items }: { items: MediaDocItem[] }) {
  if (!items?.length) return null;

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => {
        if (item.acf_fc_layout === "img" && item.img) {
          return (
            <div key={i} className="relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
              <Image
                src={item.img.source_url}
                alt={item.img.alt_text || ""}
                width={item.img.media_details?.width || 800}
                height={item.img.media_details?.height || 450}
                className="w-full h-auto"
              />
            </div>
          );
        }

        if (item.acf_fc_layout === "galerie" && item.galerie?.length) {
          return (
            <div key={i} className="grid grid-cols-2 gap-2">
              {item.galerie.map((img, j) => (
                <div key={j} className="relative rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <Image
                    src={img.source_url}
                    alt={img.alt_text || ""}
                    width={img.media_details?.width || 400}
                    height={img.media_details?.height || 300}
                    className="w-full h-auto object-cover"
                  />
                </div>
              ))}
            </div>
          );
        }

        if (item.acf_fc_layout === "editeur" && item.editeur) {
          return (
            <div
              key={i}
              className="wp-content text-sm bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-4 border border-[var(--color-border)]"
              dangerouslySetInnerHTML={{ __html: item.editeur }}
            />
          );
        }

        if (item.acf_fc_layout === "fichier" && item.fichier) {
          const sizeKb = item.fichier.filesize
            ? `${Math.round(item.fichier.filesize / 1024)} Ko`
            : null;

          return (
            <a
              key={i}
              href={item.fichier.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
            >
              <span className="text-xl">📎</span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-[var(--color-text)] truncate">
                  {item.fichier.filename}
                </span>
                {sizeKb && (
                  <span className="text-xs text-[var(--color-muted)]">{sizeKb}</span>
                )}
              </div>
            </a>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function DocSection({ section, index }: { section: DocSectionType; index: number }) {
  const mediaRight = (section.media_position ?? "Droite") === "Droite";
  const hasMedia   = section.media_doc?.length > 0;

  const textBlock = (
    <div className="flex flex-col gap-3 justify-center">
      {section.title_doc && (
        <h3 className="text-lg font-semibold text-[var(--color-text)]">
          {section.title_doc}
        </h3>
      )}
      {section.description_doc && (
        <div
          className="wp-content text-sm leading-relaxed text-[var(--color-text)]"
          dangerouslySetInnerHTML={{ __html: section.description_doc }}
        />
      )}
    </div>
  );

  const mediaBlock = hasMedia ? (
    <MediaBlock items={section.media_doc} />
  ) : null;

  return (
    <div
      className={`flex flex-col ${hasMedia ? "lg:flex-row" : ""} gap-8 py-8 ${
        index > 0 ? "border-t border-[var(--color-border)]" : ""
      }`}
    >
      {hasMedia ? (
        mediaRight ? (
          <>
            <div className="flex-1">{textBlock}</div>
            <div className="flex-1">{mediaBlock}</div>
          </>
        ) : (
          <>
            <div className="flex-1">{mediaBlock}</div>
            <div className="flex-1">{textBlock}</div>
          </>
        )
      ) : (
        textBlock
      )}
    </div>
  );
}
