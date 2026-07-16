export type RankingItem = {
  vehicle_id: string;
  placa: string;
  prob_falla_30d: number;
  riesgo: "alto" | "medio" | "bajo";
  correctivos_90d: number;
};
