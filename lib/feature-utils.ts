import type { Feature } from "@/lib/types";

/** Seuil de "fraîcheur" — au-delà, le badge "Nouveauté" disparaît automatiquement. */
export const NEW_FEATURE_DAYS = 30;

/**
 * Renvoie true si la feature a été créée il y a moins de `days` jours.
 * Tolérant : retourne false si la date est manquante, invalide ou dans le futur.
 */
export function isFeatureRecent(
  dateStr: string | undefined | null,
  days = NEW_FEATURE_DAYS
): boolean {
  if (!dateStr) return false;
  const created = new Date(dateStr).getTime();
  if (isNaN(created)) return false;
  const diffDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < days;
}

/**
 * Filtre les features ajoutées dans les `days` derniers jours, triées par date
 * décroissante (les plus récentes d'abord), et limite à `limit` éléments.
 */
export function getRecentFeatures(
  features: Feature[],
  limit = 10,
  days = NEW_FEATURE_DAYS
): Feature[] {
  return features
    .filter((f) => isFeatureRecent(f.date, days))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
