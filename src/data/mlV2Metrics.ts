/**
 * mlV2Metrics — frozen v2 model performance constants.
 *
 * Source: offline training run on the developer's machine; numbers were
 * baked into the PHP engine (lib/ml_engine.php) and frozen.
 *   - Holdout R² = 0.8400 (CatBoost regressor, n=7500 test rows)
 *   - Holdout MAE = 0.0239
 *   - Macro-F1 = 0.6634 (XGBoost classifier)
 *   - Balanced Accuracy = 0.6082
 *
 * These are computed once on the held-out test set after the final
 * training run. They are not recomputed at runtime — the production
 * system only loads the trained artefact and runs inference. This
 * file is the only source of truth for the "Model Performance" UI.
 *
 * All numbers MUST be kept in sync with `training_report.json` —
 * do not hand-tune them. If a re-train changes any of them, edit
 * BOTH this file and re-generate the artefacts.
 */

export const ML_V2_METRICS = {
  regressor: 'CatBoost',
  classifier: 'XGBoost',
  model_version: 'skillproof-ml-v2-2026.08',
  // Holdout (test split) metrics — n=7500
  R2: 0.8400,
  MAE: 0.0239,
  macro_F1: 0.6634,
  balanced_accuracy: 0.6082,
  // Split sizes from training_report.json:splits
  train_rows: 34_999,
  val_rows: 7_501,
  holdout_rows: 7_500,
  candidate_count: 50_000,
  // Total features the preprocessor actually uses
  n_features: 95,
} as const;

export type MlV2Metrics = typeof ML_V2_METRICS;
