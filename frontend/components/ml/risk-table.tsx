import type { RankingItem } from "@/types/ranking";
import { cn } from "@/lib/utils";

type RiskTableProps = {
  items: RankingItem[];
  columns: { plate: string; prob: string; risk: string; correctives: string };
  empty: string;
  compact?: boolean;
};

function riskClass(riesgo: RankingItem["riesgo"]) {
  if (riesgo === "alto") return "text-red-400";
  if (riesgo === "medio") return "text-amber-400";
  return "text-emerald-400";
}

export function RiskTable({ items, columns, empty, compact }: RiskTableProps) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <table className={cn("w-full", compact ? "text-sm" : "text-sm")}>
      <thead>
        <tr className="text-left text-muted-foreground border-b border-border">
          <th className="py-2">{columns.plate}</th>
          <th>{columns.prob}</th>
          <th>{columns.risk}</th>
          <th>{columns.correctives}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.vehicle_id} className="border-b border-border/50 text-foreground/90">
            <td className="py-2">{r.placa}</td>
            <td>{Number(r.prob_falla_30d).toFixed(3)}</td>
            <td className={riskClass(r.riesgo)}>{r.riesgo}</td>
            <td>{r.correctivos_90d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
