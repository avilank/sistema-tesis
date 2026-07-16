from app.ml.pipeline import run_full_pipeline

p = run_full_pipeline(n_folds=5, do_tuning=True)
print("best", p["best_model"], "thr", p.get("best_threshold"))
print("split", p["split"])
for k, m in p["models"].items():
    print(
        f"{k}: acc={m['accuracy']:.3f} mcc={m['mcc']:.3f} "
        f"f1={m['f1']:.3f} pr={m['pr_auc']:.3f} thr={m.get('threshold')}"
    )
