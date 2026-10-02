import type {
  AlertThresholds,
  Device,
  Driver,
  DrowsinessEvent,
  FleetStats,
  ModelVersion,
  Paginated,
  Severity,
  TrainingJob,
  Vehicle,
} from "@/api/types";
import { SEVERITY_ORDER } from "@/lib/severity";
import { buildSeedData } from "./seed";

type DbState = {
  vehicles: Vehicle[];
  drivers: Driver[];
  devices: Device[];
  events: DrowsinessEvent[];
  modelVersions: ModelVersion[];
  trainingJobs: TrainingJob[];
  thresholds: AlertThresholds;
  scoreHistory: { t: string; score: number }[];
};

function seedScoreHistory(vehicles: Vehicle[]): { t: string; score: number }[] {
  const points: { t: string; score: number }[] = [];
  const now = Date.now();
  const fleetAvg = mean(vehicles.map((v) => v.currentScore));
  for (let i = 47; i >= 0; i--) {
    const drift = Math.sin(i / 3.5) * 6 + (Math.random() - 0.5) * 5;
    points.push({
      t: new Date(now - i * 30 * 60_000).toISOString(),
      score: clamp(Math.round(fleetAvg + drift), 0, 100),
    });
  }
  return points;
}

function createState(): DbState {
  const seed = buildSeedData();
  return { ...seed, scoreHistory: seedScoreHistory(seed.vehicles) };
}

let state: DbState = createState();

/** Rebuild the database from the seed. Used between tests. */
export function resetDb() {
  state = createState();
}

export function getState(): DbState {
  return state;
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

export function listVehicles(): Vehicle[] {
  return state.vehicles;
}

export function getVehicle(id: string): Vehicle | undefined {
  return state.vehicles.find((v) => v.id === id);
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export function listDrivers(): Driver[] {
  return state.drivers;
}

export function getDriver(id: string): Driver | undefined {
  return state.drivers.find((d) => d.id === id);
}

/** Synthetic daily average drowsiness score for a driver, last 21 days. */
export function getDriverHistory(id: string): { t: string; score: number }[] {
  const driver = getDriver(id);
  if (!driver) return [];
  const base = driver.stats.avgScore7d;
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 21 }, (_, i) => {
    const day = 20 - i;
    const wave = Math.sin(i / 2.5) * 6;
    const trendToNow = i > 16 ? (driver.currentScore - base) * ((i - 16) / 4) : 0;
    return {
      t: new Date(Date.now() - day * 86_400_000).toISOString(),
      score: clamp(Math.round(base + wave + trendToNow + (rand() - 0.5) * 8), 0, 100),
    };
  });
}

// ─── Devices ─────────────────────────────────────────────────────────────────

export function listDevices(): Device[] {
  return state.devices;
}

export function getDevice(id: string): Device | undefined {
  return state.devices.find((d) => d.id === id);
}

export function forceDeviceSync(id: string): Device | undefined {
  const device = getDevice(id);
  if (!device) return undefined;
  device.connectivity = "online";
  device.lastSyncAt = new Date().toISOString();
  device.bufferedFrames = 0;
  return device;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventQuery = {
  page?: number;
  pageSize?: number;
  severity?: Severity[];
  driverId?: string;
  vehicleId?: string;
  acknowledged?: boolean;
  from?: string;
  to?: string;
  sort?: "timestamp" | "score" | "severity";
  dir?: "asc" | "desc";
};

export function queryEvents(q: EventQuery): Paginated<DrowsinessEvent> {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;

  let rows = state.events.slice();

  if (q.severity?.length) {
    rows = rows.filter((e) => q.severity!.includes(e.severity));
  }
  if (q.driverId) rows = rows.filter((e) => e.driverId === q.driverId);
  if (q.vehicleId) rows = rows.filter((e) => e.vehicleId === q.vehicleId);
  if (typeof q.acknowledged === "boolean") {
    rows = rows.filter((e) => (e.acknowledgedAt !== null) === q.acknowledged);
  }
  if (q.from) rows = rows.filter((e) => e.timestamp >= q.from!);
  if (q.to) rows = rows.filter((e) => e.timestamp <= q.to!);

  const sort = q.sort ?? "timestamp";
  const dirFactor = (q.dir ?? "desc") === "desc" ? -1 : 1;
  rows.sort((a, b) => {
    let cmp: number;
    if (sort === "score") cmp = a.score - b.score;
    else if (sort === "severity")
      cmp = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    else cmp = a.timestamp.localeCompare(b.timestamp);
    return cmp * dirFactor;
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total, page, pageSize };
}

export function getEvent(id: string): DrowsinessEvent | undefined {
  return state.events.find((e) => e.id === id);
}

export function acknowledgeEvent(
  id: string,
  by: string,
): DrowsinessEvent | undefined {
  const event = getEvent(id);
  if (!event) return undefined;
  event.acknowledgedAt = new Date().toISOString();
  event.acknowledgedBy = by;
  return event;
}

// ─── ML ──────────────────────────────────────────────────────────────────────

export function listModelVersions(): ModelVersion[] {
  return state.modelVersions;
}

export function getModelVersion(id: string): ModelVersion | undefined {
  return state.modelVersions.find((m) => m.id === id);
}

export function listTrainingJobs(): TrainingJob[] {
  return state.trainingJobs;
}

export function getTrainingJob(id: string): TrainingJob | undefined {
  return state.trainingJobs.find((j) => j.id === id);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getThresholds(): AlertThresholds {
  return state.thresholds;
}

export function updateThresholds(patch: Partial<AlertThresholds>): AlertThresholds {
  state.thresholds = { ...state.thresholds, ...patch };
  return state.thresholds;
}

// ─── Derived fleet stats ─────────────────────────────────────────────────────

export function getFleetStats(): FleetStats {
  const { vehicles, drivers, devices, events } = state;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const severityBreakdown = SEVERITY_ORDER.reduce(
    (acc, level) => {
      acc[level] = vehicles.filter((v) => v.currentSeverity === level).length;
      return acc;
    },
    {} as Record<Severity, number>,
  );

  return {
    vehiclesTotal: vehicles.length,
    driversOnShift: drivers.filter((d) => d.onShift).length,
    driversDrowsyOrWorse: vehicles.filter(
      (v) => v.currentSeverity === "drowsy" || v.currentSeverity === "critical",
    ).length,
    devicesOffline: devices.filter((d) => d.connectivity === "offline").length,
    eventsToday: events.filter(
      (e) => new Date(e.timestamp) >= startOfToday,
    ).length,
    avgFleetScore: Math.round(
      mean(vehicles.filter((v) => v.status !== "offline").map((v) => v.currentScore)),
    ),
    scoreTrend: state.scoreHistory.slice(),
    severityBreakdown,
  };
}

// ─── Live-simulation mutators (called by ./live) ─────────────────────────────

export function insertEvent(event: DrowsinessEvent) {
  state.events = [event, ...state.events].slice(0, 600);
}

export function pushScoreHistoryPoint() {
  const avg = mean(
    state.vehicles
      .filter((v) => v.status !== "offline")
      .map((v) => v.currentScore),
  );
  state.scoreHistory = [
    ...state.scoreHistory.slice(-95),
    { t: new Date().toISOString(), score: clamp(Math.round(avg), 0, 100) },
  ];
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
