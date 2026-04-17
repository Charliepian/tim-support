import type { FeatureStatus } from "@/lib/types";

const styles: Record<FeatureStatus, string> = {
  Disponible:    "bg-success-bg text-success-text border-success/30",
  Beta:          "bg-processing-bg text-processing-text border-processing/30",
  Prochainement: "bg-unavailable-bg text-unavailable border-unavailable/30",
};

export default function StatusBadge({ status }: { status: FeatureStatus }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${styles[status] ?? styles.Disponible}`}>
      {status}
    </span>
  );
}
