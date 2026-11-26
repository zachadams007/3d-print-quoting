import type {
  Material,
  Settings,
  QualityPreset,
  InfillPreset,
  Estimate,
  FileEstimate,
} from "@/lib/types";

// 2 wall loops × 0.4mm nozzle = 0.8mm - matches Bambu Studio default.
const SHELL_THICKNESS_MM = 0.8;

// Calibrated for effective (shell+infill) volume on a modern CoreXY FDM printer
// (e.g. Bambu X1C). Derived from ~7 mm³/s net throughput including travel,
// retraction, and layer-change overhead → 1000/7/3600 ≈ 0.04 hrs/cm³.
const CALIBRATED_HOURS_PER_CM3 = 0.04;

// The seed value that shipped in 001_initial.sql for base_hours_per_cm3.
// Used to turn the legacy setting into a speed-scaling knob:
//   speedScale = current_setting / OLD_DEFAULT  →  1.0 when unchanged.
const OLD_DEFAULT_BASE_HOURS = 0.5;

export interface EstimateInput {
  fileEstimates: FileEstimate[];
  material: Material;
  settings: Settings;
  qualityPreset: QualityPreset;
  infillPreset: InfillPreset;
  supports: boolean;
  rush: boolean;
  colorPriceMultiplier?: number;
}

/**
 * Compute the effective material volume (mm³) using a shell-infill model.
 *
 * Real FDM prints consist of solid perimeter shells (~0.8 mm for 2 walls)
 * with sparse infill filling only the interior.
 *
 * Mesh triangle SA is always >= the true smooth surface area because flat
 * triangles approximate curves with extra area, and geometric detail
 * (fingers, horns, thin features) compounds the inflation.  Rather than
 * a hard cap we smoothly reduce the effective shell thickness as the
 * mesh SA grows relative to a cube of equal volume (SA = 6·V^⅔).
 * For simple shapes the ratio is ≈1 and the full 0.8 mm is used;
 * for complex/detailed shapes the thickness tapers gently so the shell
 * doesn't swallow most of the volume.
 */
function effectiveVolumeMm3(
  meshVolumeMm3: number,
  surfaceAreaMm2: number,
  infillFraction: number,
): number {
  const cubeSA = 6 * Math.pow(meshVolumeMm3, 2 / 3);
  const complexity = Math.max(1, surfaceAreaMm2 / cubeSA);
  const thickness = SHELL_THICKNESS_MM / Math.pow(complexity, 0.2);

  const shellVol = surfaceAreaMm2 * thickness;
  const interiorVol = Math.max(0, meshVolumeMm3 - shellVol);
  return shellVol + interiorVol * infillFraction;
}

export function calculateEstimate(input: EstimateInput): Estimate {
  const {
    fileEstimates,
    material,
    settings,
    qualityPreset,
    infillPreset,
    supports,
    rush,
  } = input;

  const manualRequired = fileEstimates.some((f) => f.manualRequired);

  const totalVolumeMm3 = fileEstimates.reduce(
    (sum, f) => sum + ((f.volumeCm3 ?? 0) * 1000),
    0,
  );
  const totalSurfaceAreaMm2 = fileEstimates.reduce(
    (sum, f) => sum + (f.surfaceAreaMm2 ?? 0),
    0,
  );
  const totalVolumeCm3 = totalVolumeMm3 / 1000;

  if (totalVolumeCm3 === 0) {
    return {
      totalVolumeCm3: 0,
      grams: 0,
      timeHours: 0,
      turnaroundDays: 0,
      price: 0,
      manualRequired: true,
      minimumApplied: false,
      minimumPrice: settings.minimum_price,
    };
  }

  const infillFraction = parseFloat(infillPreset) / 100;
  const qualityMult = settings.quality_multipliers[qualityPreset] ?? 1.0;
  const infillPriceMult = settings.infill_multipliers[infillPreset] ?? 1.0;
  const supportsMult = supports ? 1.15 : 1.0;
  const colorMult = input.colorPriceMultiplier ?? 1.0;

  const hasSurfaceArea = totalSurfaceAreaMm2 > 0;

  const effectiveVolCm3 = hasSurfaceArea
    ? effectiveVolumeMm3(totalVolumeMm3, totalSurfaceAreaMm2, infillFraction) / 1000
    : totalVolumeCm3 * infillFraction;

  const grams =
    effectiveVolCm3 * material.density_g_cm3 * settings.waste_factor;

  // base_hours_per_cm3 (DB default 0.5) acts as a printer-speed knob:
  // 0.5 = modern CoreXY baseline, higher = slower printer, lower = faster.
  const speedScale = settings.base_hours_per_cm3 / OLD_DEFAULT_BASE_HOURS;

  const timeHours =
    effectiveVolCm3 *
      CALIBRATED_HOURS_PER_CM3 *
      speedScale *
      material.time_multiplier *
      qualityMult *
      supportsMult +
    settings.overhead_hours;

  const printHoursPerDay = settings.printing_hours_per_day || 8;
  const bufferHours = settings.buffer_hours_per_job || 0.5;
  const turnaroundDays = Math.ceil(
    (timeHours + bufferHours) / printHoursPerDay,
  );

  const isNonDefaultQuality = qualityPreset !== "0.20";
  const isNonDefaultInfill = infillPreset !== "15";
  const isSpecialJob = supports || isNonDefaultQuality || isNonDefaultInfill;

  const setupFee = isSpecialJob
    ? settings.setup_fee_special
    : settings.setup_fee_standard;
  const supportsFee = supports ? settings.supports_fee : 0;

  const cappedGrams = Math.min(grams, 100);
  const effectivePPG =
    material.price_per_gram +
    (material.price_per_gram_slope ?? 0) * cappedGrams;

  const baseCost =
    setupFee +
    grams * effectivePPG * infillPriceMult * colorMult +
    timeHours * settings.time_rate_per_hour +
    supportsFee;

  const minimumApplied = baseCost < settings.minimum_price;
  const preRush = Math.max(settings.minimum_price, baseCost);
  const price = rush ? preRush * settings.rush_multiplier : preRush;

  return {
    totalVolumeCm3,
    grams,
    timeHours,
    turnaroundDays,
    price,
    manualRequired,
    minimumApplied,
    minimumPrice: settings.minimum_price,
  };
}
