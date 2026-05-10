"use client";

interface SearchBarProps {
  /** Variante compacte (header secondaire, sidebar…) */
  compact?: boolean;
  /** Valeur affichée dans la barre — utilisée par la page /search pour rappeler la query courante */
  defaultValue?: string;
}

/**
 * Barre de recherche "trigger" : visuellement c'est un input, mais au clic
 * elle ouvre la SearchModal globale (logique smart : tokens, accents, keywords…).
 * Communique avec la modale via un événement window pour ne pas avoir besoin
 * de Context / état partagé.
 */
function openSearchModal(query?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("tim-search:open", { detail: { query: query?.trim() || undefined } })
  );
}

export default function SearchBar({ compact, defaultValue = "" }: SearchBarProps) {
  const hasValue = defaultValue.trim().length > 0;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => openSearchModal(defaultValue)}
        className="relative w-full max-w-sm h-9 pl-9 pr-3 text-sm text-left bg-surface border border-border rounded-md outline-none focus:ring-2 focus:ring-primary hover:bg-white transition flex items-center"
      >
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <span className={`flex-1 truncate ${hasValue ? "text-foreground" : "text-muted"}`}>
          {hasValue ? defaultValue : "Rechercher..."}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openSearchModal(defaultValue)}
      className="group relative w-full max-w-2xl mx-auto h-13 pl-12 pr-4 text-base text-left bg-white border-2 border-border rounded-lg outline-none focus:ring-2 focus:ring-primary hover:border-primary shadow-sm transition flex items-center"
    >
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-hover:text-primary transition-colors"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <span className={`flex-1 truncate ${hasValue ? "text-foreground" : "text-muted"}`}>
        {hasValue ? defaultValue : "Rechercher une fonctionnalité ou poser une question…"}
      </span>
      <kbd className="hidden sm:flex items-center gap-0.5 text-[11px] font-mono px-1.5 py-0.5 rounded border border-border bg-surface text-muted shrink-0">
        <span>⌘</span><span>K</span>
      </kbd>
    </button>
  );
}
