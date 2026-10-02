import { fakerPT_BR as faker } from "@faker-js/faker";

import type {
  AlertThresholds,
  Device,
  Driver,
  DrowsinessEvent,
  EventTrigger,
  ModelVersion,
  TrainingJob,
  Vehicle,
} from "@/api/types";
import { severityForScore } from "@/lib/severity";
import { DEFAULT_THRESHOLDS } from "@/lib/severity";
import { FREIGHT_HUBS, jitterAround } from "./geo";

const SEED = 20260903;

const VEHICLE_COUNT = 38;
const EVENT_COUNT = 320;
const MODEL_COUNT = 7;
const TRAINING_JOB_COUNT = 5;

const TRUCK_MODELS: { make: string; model: string }[] = [
  { make: "Volvo", model: "FH 540" },
  { make: "Volvo", model: "VM 270" },
  { make: "Scania", model: "R 450" },
  { make: "Scania", model: "P 320" },
  { make: "Mercedes-Benz", model: "Actros 2651" },
  { make: "Mercedes-Benz", model: "Axor 2544" },
  { make: "Mercedes-Benz", model: "Atego 1719" },
  { make: "Iveco", model: "Tector 240E28" },
  { make: "Iveco", model: "S-Way 540" },
  { make: "DAF", model: "XF 480" },
  { make: "Volkswagen", model: "Constellation 24.280" },
  { make: "MAN", model: "TGX 29.480" },
];

const DEVICE_MODELS = ["Helio IR-2", "Helio IR-3", "Helio Edge A1", "Helio Edge A2"];

const ALL_TRIGGERS: EventTrigger[] = [
  "eye-closure",
  "yawn",
  "head-nod",
  "perclos",
  "gaze-off-road",
];

export type SeedData = {
  vehicles: Vehicle[];
  drivers: Driver[];
  devices: Device[];
  events: DrowsinessEvent[];
  modelVersions: ModelVersion[];
  trainingJobs: TrainingJob[];
  thresholds: AlertThresholds;
};

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function plate(rand: () => number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const L = () => letters[Math.floor(rand() * letters.length)];
  const D = () => Math.floor(rand() * 10);
  // Mercosul pattern: LLL D L DD
  return `${L()}${L()}${L()}${D()}${L()}${D()}${D()}`;
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function buildSeedData(): SeedData {
  faker.seed(SEED);
  const rand = mulberry32(SEED);

  const modelVersions = buildModelVersions(rand);
  const deployedModel =
    modelVersions.find((m) => m.status === "deployed") ?? modelVersions[0]!;
  const stagedModel = modelVersions.find((m) => m.status === "staged");

  const drivers: Driver[] = [];
  const vehicles: Vehicle[] = [];
  const devices: Device[] = [];

  for (let i = 0; i < VEHICLE_COUNT; i++) {
    const id = String(i + 1).padStart(3, "0");
    const hub = pick(FREIGHT_HUBS, rand);

    const statusRoll = rand();
    const status =
      statusRoll < 0.12 ? "offline" : statusRoll < 0.3 ? "idle" : "online";

    // Score distribution: most drivers alert, a tail of elevated fatigue.
    const scoreRoll = rand();
    const baseScore =
      scoreRoll < 0.62
        ? rand() * 22
        : scoreRoll < 0.85
          ? 25 + rand() * 22
          : scoreRoll < 0.96
            ? 50 + rand() * 20
            : 75 + rand() * 22;
    const currentScore = status === "offline" ? 0 : Math.round(baseScore);
    const currentSeverity = severityForScore(currentScore);

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const onShift = status !== "offline" && rand() < 0.9;

    const driver: Driver = {
      id: `drv_${id}`,
      name: `${firstName} ${lastName}`,
      licenseNo: String(Math.floor(rand() * 9_000_000_000) + 1_000_000_000),
      phone: `+55 ${11 + Math.floor(rand() * 80)} 9${Math.floor(
        rand() * 90_000_000 + 10_000_000,
      )}`,
      assignedVehicleId: `veh_${id}`,
      currentScore,
      currentSeverity,
      onShift,
      shiftStartedAt: onShift ? minutesAgoIso(Math.floor(rand() * 480 + 30)) : null,
      stats: {
        avgScore7d: Math.round(Math.max(4, currentScore * 0.6 + rand() * 14)),
        eventsThisWeek: Math.floor(rand() * (currentSeverity === "alert" ? 2 : 7)),
        hoursDrivenThisWeek: Math.round(rand() * 44 + 6),
      },
    };

    const heading = Math.floor(rand() * 360);
    const speedKph =
      status === "offline"
        ? 0
        : status === "idle"
          ? Math.round(rand() * 6)
          : Math.round(40 + rand() * 55);

    const vehicle: Vehicle = {
      id: `veh_${id}`,
      plate: plate(rand),
      ...pick(TRUCK_MODELS, rand),
      year: 2012 + Math.floor(rand() * 13),
      deviceId: `dev_${id}`,
      driverId: driver.id,
      status,
      location: { ...jitterAround(hub, 140, rand), heading, speedKph },
      currentScore,
      currentSeverity,
      lastSeenAt:
        status === "offline"
          ? minutesAgoIso(Math.floor(rand() * 5000 + 60))
          : minutesAgoIso(Math.floor(rand() * 4)),
    };

    const connectivity = status === "offline" ? "offline" : "online";
    const runsStaged = Boolean(stagedModel) && rand() < 0.25;

    const device: Device = {
      id: `dev_${id}`,
      hardwareModel: pick(DEVICE_MODELS, rand),
      firmwareVersion: `${2 + Math.floor(rand() * 2)}.${Math.floor(rand() * 6)}.${Math.floor(
        rand() * 5,
      )}`,
      vehicleId: vehicle.id,
      cameraStatus: rand() < 0.08 ? "degraded" : rand() < 0.03 ? "offline" : "ok",
      connectivity,
      lastSyncAt:
        connectivity === "online"
          ? minutesAgoIso(Math.floor(rand() * 180))
          : minutesAgoIso(Math.floor(rand() * 6000 + 240)),
      storageUsedPct: Math.round(rand() * 80 + 10),
      bufferedFrames:
        connectivity === "offline"
          ? Math.floor(rand() * 4000 + 200)
          : Math.floor(rand() * 400),
      deployedModelVersionId:
        runsStaged && stagedModel ? stagedModel.id : deployedModel.id,
    };

    drivers.push(driver);
    vehicles.push(vehicle);
    devices.push(device);
  }

  const events = buildEvents(rand, vehicles);
  const trainingJobs = buildTrainingJobs(rand, devices, modelVersions);

  return {
    vehicles,
    drivers,
    devices,
    events,
    modelVersions,
    trainingJobs,
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      notifyOn: "drowsy",
      emailAlerts: true,
      smsAlerts: false,
    },
  };
}

function buildEvents(
  rand: () => number,
  vehicles: Vehicle[],
): DrowsinessEvent[] {
  const events: DrowsinessEvent[] = [];

  for (let i = 0; i < EVENT_COUNT; i++) {
    const vehicle = pick(vehicles, rand);
    const ageDays = Math.pow(rand(), 1.8) * 14; // weighted toward recent
    const score = Math.round(45 + rand() * 55);
    const severity = severityForScore(score);
    const triggerCount = 1 + Math.floor(rand() * 3);
    const triggers = faker.helpers
      .shuffle([...ALL_TRIGGERS])
      .slice(0, triggerCount);
    const acknowledged = ageDays > 0.4 && rand() < 0.8;
    const id = `evt_${String(EVENT_COUNT - i).padStart(4, "0")}`;

    events.push({
      id,
      vehicleId: vehicle.id,
      driverId: vehicle.driverId,
      timestamp: daysAgoIso(ageDays),
      score,
      severity,
      durationSec: Math.round(2 + rand() * 40),
      triggers,
      location: {
        lat: vehicle.location.lat + (rand() - 0.5) * 0.4,
        lng: vehicle.location.lng + (rand() - 0.5) * 0.4,
      },
      frames: {
        ir: `/api/frames/${id}/ir.svg`,
        landmarks: `/api/frames/${id}/landmarks.svg`,
      },
      acknowledgedAt: acknowledged ? daysAgoIso(ageDays - 0.05) : null,
      acknowledgedBy: acknowledged ? "Central de Operações" : null,
    });
  }

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function buildModelVersions(rand: () => number): ModelVersion[] {
  const versions: ModelVersion[] = [];
  for (let i = 0; i < MODEL_COUNT; i++) {
    const minor = i;
    const trainedAt = daysAgoIso((MODEL_COUNT - i) * 26 + rand() * 8);
    const isLast = i === MODEL_COUNT - 1;
    const isPrev = i === MODEL_COUNT - 2;
    const status: ModelVersion["status"] = isLast
      ? "candidate"
      : isPrev
        ? "deployed"
        : i === MODEL_COUNT - 3
          ? "staged"
          : "archived";

    const accuracy = 0.83 + i * 0.017 + rand() * 0.01;
    versions.push({
      id: `mdl_1_${minor}_0`,
      version: `1.${minor}.0`,
      trainedAt,
      metrics: {
        accuracy: round(accuracy, 3),
        precision: round(accuracy - 0.02 + rand() * 0.02, 3),
        recall: round(accuracy - 0.05 + rand() * 0.03, 3),
        falseAlarmRate: round(0.12 - i * 0.011 + rand() * 0.01, 3),
      },
      status,
      rolloutPct: status === "deployed" ? 78 : status === "staged" ? 22 : 0,
      deviceCount: status === "deployed" ? 30 : status === "staged" ? 8 : 0,
      notes:
        status === "candidate"
          ? "Aguardando avaliação final antes da liberação."
          : status === "staged"
            ? "Implantação gradual em curso na frota piloto."
            : status === "deployed"
              ? "Versão de produção atual."
              : "Versão anterior arquivada.",
    });
  }
  return versions;
}

function buildTrainingJobs(
  rand: () => number,
  devices: Device[],
  models: ModelVersion[],
): TrainingJob[] {
  const statuses: TrainingJob["status"][] = [
    "collecting",
    "training",
    "evaluating",
    "ready",
    "deployed",
  ];
  const jobs: TrainingJob[] = [];

  for (let i = 0; i < TRAINING_JOB_COUNT; i++) {
    const status = statuses[i % statuses.length]!;
    const progressPct =
      status === "collecting"
        ? Math.round(rand() * 60 + 10)
        : status === "training"
          ? Math.round(rand() * 50 + 25)
          : status === "evaluating"
            ? Math.round(rand() * 20 + 70)
            : 100;
    const startedDays = (TRAINING_JOB_COUNT - i) * 4 + rand() * 3;

    jobs.push({
      id: `job_${String(TRAINING_JOB_COUNT - i).padStart(3, "0")}`,
      greengrassJobId: `gg-${faker.string.alphanumeric({ length: 10, casing: "lower" })}`,
      status,
      startedAt: daysAgoIso(startedDays),
      updatedAt: minutesAgoIso(Math.floor(rand() * 600)),
      sampleCount: Math.floor(rand() * 40_000 + 8_000),
      sourceDeviceIds: faker.helpers
        .shuffle(devices.map((d) => d.id))
        .slice(0, 3 + Math.floor(rand() * 6)),
      progressPct,
      resultingModelVersionId:
        status === "deployed" || status === "ready"
          ? (models[models.length - 1 - (i % 2)]?.id ?? null)
          : null,
    });
  }

  return jobs;
}

function round(value: number, places: number): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}
