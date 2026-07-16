export type Eda = {
  n_observaciones: number;
  n_vehiculos: number;
  n_features: number;
  prevalencia_global_pct: number;
  periodo: { inicio: string; fin: string };
  tabla_clases: { clase: string; n: number }[];
  figuras: { heatmap: string };
};
