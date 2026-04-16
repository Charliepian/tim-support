import type { FeatureStatus } from "@/lib/types";

const styles: Record<FeatureStatus, string> = {
  Disponible:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Beta:          "bg-amber-50  text-amber-700  border-amber-200",
  Prochainement: "bg-slate-50  text-slate-500  border-slate-200",
};

const labels: Record<FeatureStatus, string> = {
  Disponible:    "Disponible",
  Beta:          "Beta",
  Prochainement: "Prochainement",
};

export default function StatusBadge({ status }: { status: FeatureStatus }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${styles[status] ?? styles.Disponible}`}>
      {labels[status] ?? status}
    </span>
  );
}
