/**
 * Domain model for the Helio fleet drowsiness-monitoring dashboard.
 *
 * These types are the contract between the UI and the API. The mock layer in
 * `./mock` implements them today; a real backend replaces the mock while
 * keeping the same shapes. Field names are English; any user-facing label
 * derived from them is translated in the components.
 */

export type Severity = "alert" | "mild" | "drowsy" | "critical";

export type VehicleStatus = "online" | "idle" | "offline";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type GeoPoint = Coordinates & {
  /** Heading in degrees clockwise from north. */
  heading: number;
  /** Ground speed in km/h. */
  speedKph: number;
};

export type Vehicle = {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  deviceId: string;
  driverId: string;
  status: VehicleStatus;
  location: GeoPoint;
  /** Most recent drowsiness score reported for the active driver (0–100). */
  currentScore: number;
  currentSeverity: Severity;
  lastSeenAt: string;
};

export type DriverStats = {
  avgScore7d: number;
  eventsThisWeek: number;
  hoursDrivenThisWeek: number;
};

export type Driver = {
  id: string;
  name: string;
  licenseNo: string;
  phone: string;
  assignedVehicleId: string | null;
  currentScore: number;
  currentSeverity: Severity;
  onShift: boolean;
  shiftStartedAt: string | null;
  stats: DriverStats;
};

export type CameraStatus = "ok" | "degraded" | "offline";
export type Connectivity = "online" | "offline";

export type Device = {
  id: string;
  hardwareModel: string;
  firmwareVersion: string;
  vehicleId: string;
  cameraStatus: CameraStatus;
  connectivity: Connectivity;
  lastSyncAt: string;
  storageUsedPct: number;
  /** Frames buffered locally, waiting to be uploaded to Greengrass. */
  bufferedFrames: number;
  deployedModelVersionId: string;
};

export type EventTrigger =
  | "eye-closure"
  | "yawn"
  | "head-nod"
  | "perclos"
  | "gaze-off-road";

export type DrowsinessEvent = {
  id: string;
  vehicleId: string;
  driverId: string;
  timestamp: string;
  score: number;
  severity: Severity;
  durationSec: number;
  triggers: EventTrigger[];
  location: Coordinates;
  frames: {
    ir: string;
    landmarks: string;
  };
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};

export type ModelStatus = "candidate" | "staged" | "deployed" | "archived";

export type ModelMetrics = {
  accuracy: number;
  precision: number;
  recall: number;
  falseAlarmRate: number;
};

export type ModelVersion = {
  id: string;
  version: string;
  trainedAt: string;
  metrics: ModelMetrics;
  status: ModelStatus;
  /** Percentage of the fleet running this version (0–100). */
  rolloutPct: number;
  deviceCount: number;
  notes: string;
};

export type TrainingJobStatus =
  | "collecting"
  | "queued"
  | "training"
  | "evaluating"
  | "ready"
  | "failed"
  | "deployed";

export type TrainingJob = {
  id: string;
  greengrassJobId: string;
  status: TrainingJobStatus;
  startedAt: string;
  updatedAt: string;
  sampleCount: number;
  sourceDeviceIds: string[];
  progressPct: number;
  resultingModelVersionId: string | null;
};

export type FleetStats = {
  vehiclesTotal: number;
  driversOnShift: number;
  driversDrowsyOrWorse: number;
  devicesOffline: number;
  eventsToday: number;
  avgFleetScore: number;
  /** Hourly fleet-average score for the last 24h, oldest first. */
  scoreTrend: { t: string; score: number }[];
  severityBreakdown: Record<Severity, number>;
};

/** Alert thresholds, editable in Settings and persisted by the API. */
export type AlertThresholds = {
  mild: number;
  drowsy: number;
  critical: number;
  notifyOn: Severity;
  emailAlerts: boolean;
  smsAlerts: boolean;
};

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};
