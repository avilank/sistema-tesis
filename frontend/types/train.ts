export type TrainJobStatus = {
  status: "idle" | "running" | "completed" | "failed";
  step: string;
  progress: number;
  error: string | null;
  best_model: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type TrainStartResponse = {
  status: "running";
  message: string;
  started_at: string;
};
