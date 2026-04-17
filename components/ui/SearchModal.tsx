"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Feature, FeatureTerm } from "@/lib/types";

interface Props {
  open:    boolean;
  onClose: () => void;
}

/** Retire les balises HTML et normalise les espaces */
function strip(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Surligne la partie qui correspond à la query */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/15 text-primary font-semibold rounded-sm px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchModal({ open, onClose }: Props) {
  const [query,       setQuery]       = useState("");
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [categories,  setCategories]  = useState<FeatureTerm[]>([]);
  const [loaded,      setLoaded]      = useState(false);
  const [active,      setActive]      = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  // Chargement unique au mount : toutes les features + catégories racines
  useEffect(() => {
    async function load() {
      try {
        const [featRes, catRes] = await Promise.all([
          fetch("/api/features"),
          fetch("/api/feature-categories"),
        ]);
        const feats: Feature[]     = await featRes.json();
        const cats:  FeatureTerm[] = await catRes.json();
        setAllFeatures(Array.isArray(feats) ? feats : []);
        setCategories(Array.isArray(cats) ? cats.filter((c) => !c.parent || c.parent === 0) : []);
      } catch {
        /* silencieux */
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  // Reset + focus à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Recherche avec score — filtre sur les features déjà chargées (instantané)
  const results = useMemo<Feature[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return allFeatures
      .map((f) => {
        const title = (f.acf?.title_feature || f.title).toLowerCase();
        const desc  = f.acf?.short_description ? strip(f.acf.short_description) : "";
        const cats  = f.categories.map((c) => c.name.toLowerCase()).join(" ");
        const plats = f.platforms.map((p) => p.name.toLowerCase()).join(" ");
        // Sections doc
        const docTitles = (f.acf?.doc ?? []).map((s) => s.title_doc?.toLowerCase() ?? "").join(" ");

        let score = 0;
        if (title === q)              score += 20;
        else if (title.startsWith(q)) score += 12;
        else if (title.includes(q))   score += 7;
        if (docTitles.includes(q))    score += 4;
        if (desc.includes(q))         score += 3;
        if (cats.includes(q))         score += 2;
        if (plats.includes(q))        score += 1;

        return { f, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.f);
  }, [query, allFeatures]);

  // Suggestions quand pas de query : 5 features récentes
  const suggestions = useMemo(
    () => allFeatures.slice(0, 5),
    [allFeatures]
  );

  const displayList = query.trim() ? results : suggestions;

  const navigate = useCallback((path: string) => {
    onClose();
    router.push(path);
  }, [onClose, router]);

  // Navigation clavier
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")    { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, displayList.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      if (e.key === "Enter" && displayList[active]) navigate(`/features/${displayList[active].slug}`);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, displayList, active, navigate, onClose]);

  if (!open) return null;

  const q = query.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden border border-border">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <svg className="w-5 h-5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder="Rechercher une fonctionnalité…"
            className="flex-1 text-sm text-foreground placeholder:text-muted outline-none bg-transparent"
          />
          {!loaded && (
            <svg className="w-4 h-4 text-muted animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {q && (
            <button onClick={() => setQuery("")} className="text-muted hover:text-foreground transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button onClick={onClose} className="text-xs text-muted border border-border px-1.5 py-0.5 rounded hover:bg-surface transition shrink-0">
            Esc
          </button>
        </div>

        {/* Catégories rapides */}
        {!q && categories.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Parcourir</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/features?category=${cat.slug}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border bg-surface text-foreground hover:bg-[#f0f0f0] transition-all"
                >
                  {cat.slug === "web" ? "🖥️" : cat.slug === "mobile" ? "📱" : "📁"}
                  {cat.name}
                </button>
              ))}
              <button
                onClick={() => navigate("/features")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border text-muted hover:bg-surface transition-all"
              >
                Toutes →
              </button>
            </div>
          </div>
        )}

        {/* Liste résultats / suggestions */}
        {displayList.length > 0 && (
          <div>
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wider">
              {q ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : "Suggestions"}
            </p>
            <ul className="pb-2 max-h-72 overflow-y-auto">
              {displayList.map((feature, i) => {
                const title   = feature.acf?.title_feature || feature.title;
                const excerpt = feature.acf?.short_description
                  ? strip(feature.acf.short_description).slice(0, 80)
                  : null;
                return (
                  <li key={feature.id}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigate(`/features/${feature.slug}`)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-2.5 transition-colors ${
                        active === i ? "bg-surface" : "hover:bg-surface"
                      }`}
                    >
                      <svg className="w-4 h-4 mt-0.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          <Highlight text={title} query={q} />
                        </p>
                        {excerpt && (
                          <p className="text-xs text-muted truncate mt-0.5">
                            <Highlight text={excerpt} query={q} />
                          </p>
                        )}
                        {feature.categories.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {feature.categories.slice(0, 2).map((c) => (
                              <span key={c.id} className="text-xs px-1.5 py-0.5 rounded bg-surface text-muted border border-border">
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <svg className="w-3.5 h-3.5 text-muted shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {q && loaded && results.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm font-medium text-foreground">Aucun résultat pour « {query} »</p>
            <p className="text-xs text-muted mt-1">Essayez avec un autre mot-clé</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-border bg-surface font-mono text-[10px]">↑↓</kbd>
            Naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-border bg-surface font-mono text-[10px]">↵</kbd>
            Ouvrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-border bg-surface font-mono text-[10px]">Esc</kbd>
            Fermer
          </span>
          {loaded && (
            <span className="ml-auto text-[10px] tabular-nums">
              {allFeatures.length} fonctionnalité{allFeatures.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
