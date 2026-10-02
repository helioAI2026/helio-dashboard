import type { QueryClient } from "@tanstack/react-query";

import type { DrowsinessEvent, EventTrigger } from "@/api/types";
import { severityForScore } from "@/lib/severity";
import { queryKeys } from "@/api/queries";
import * as db from "./db";
import { offset } from "./geo";

const TICK_MS = 4_000;
const HISTORY_EVERY_TICKS = 8; // ~32s

const TRIGGERS: EventTrigger[] = [
  "eye-closure",
  "yawn",
  "head-nod",
  "perclos",
  "gaze-off-road",
];

let eventCounter = 100_000;

/**
 * Drives the mock fleet: nudges vehicle positions, random-walks drowsiness
 * scores, emits new events when a driver crosses into "drowsy", and advances
 * Greengrass training jobs — then patches the React Query cache so the UI
 * reacts without a network round trip.
 *
 * Returns a disposer.
 */
export function startLiveSimulation(qc: QueryClient): () => void {
  let ticks = 0;

  const id = window.setInterval(() => {
    ticks += 1;
    const state = db.getState();
    const dtHours = TICK_MS / 3_600_000;
    const newEvents: DrowsinessEvent[] = [];

    for (const vehicle of state.vehicles) {
      const driver = state.drivers.find((d) => d.id === vehicle.driverId);

      if (vehicle.status === "online") {
        // Drift heading a little, advance along it.
        vehicle.location.heading =
          (vehicle.location.heading + (Math.random() - 0.5) * 16 + 360) % 360;
        const moved = offset(
          vehicle.location,
          vehicle.location.speedKph * dtHours,
          (vehicle.location.heading * Math.PI) / 180,
        );
        vehicle.location.lat = moved.lat;
        vehicle.location.lng = moved.lng;
        vehicle.location.speedKph = clamp(
          vehicle.location.speedKph + (Math.random() - 0.5) * 12,
          30,
          98,
        );
        vehicle.lastSeenAt = new Date().toISOString();
      }

      if (vehicle.status !== "offline") {
        // Mean-reverting random walk toward the driver's 7-day average.
        const baseline = driver?.stats.avgScore7d ?? 15;
        const prev = vehicle.currentScore;
        const next = clamp(
          prev + (baseline - prev) * 0.05 + (Math.random() - 0.5) * 9,
          0,
          100,
        );
        vehicle.currentScore = Math.round(next);
        vehicle.currentSeverity = severityForScore(vehicle.currentScore);
        if (driver) {
          driver.currentScore = vehicle.currentScore;
          driver.currentSeverity = vehicle.currentSeverity;
        }

        const crossedUp = prev < 50 && vehicle.currentScore >= 50;
        if (crossedUp && Math.random() < 0.6) {
          newEvents.push(makeEvent(vehicle.id, vehicle.driverId, vehicle));
        }
      }
    }

    for (const event of newEvents) {
      db.insertEvent(event);
    }

    advanceTrainingJobs(state.trainingJobs);

    if (ticks % HISTORY_EVERY_TICKS === 0) {
      db.pushScoreHistoryPoint();
    }

    // Patch caches directly — snappy, no refetch latency.
    qc.setQueryData(queryKeys.vehicles, [...state.vehicles]);
    qc.setQueryData(queryKeys.drivers, [...state.drivers]);
    qc.setQueryData(queryKeys.trainingJobs, [...state.trainingJobs]);
    qc.setQueryData(queryKeys.fleetStats, db.getFleetStats());

    if (newEvents.length) {
      qc.invalidateQueries({ queryKey: ["events"] });
    }
  }, TICK_MS);

  return () => window.clearInterval(id);
}

function makeEvent(
  vehicleId: string,
  driverId: string,
  vehicle: { location: { lat: number; lng: number }; currentScore: number },
): DrowsinessEvent {
  eventCounter += 1;
  const id = `evt_${eventCounter}`;
  const score = clamp(vehicle.currentScore + Math.random() * 15, 50, 100);
  return {
    id,
    vehicleId,
    driverId,
    timestamp: new Date().toISOString(),
    score: Math.round(score),
    severity: severityForScore(score),
    durationSec: Math.round(3 + Math.random() * 30),
    triggers: shuffle(TRIGGERS).slice(0, 1 + Math.floor(Math.random() * 3)),
    location: { lat: vehicle.location.lat, lng: vehicle.location.lng },
    frames: {
      ir: `/api/frames/${id}/ir.svg`,
      landmarks: `/api/frames/${id}/landmarks.svg`,
    },
    acknowledgedAt: null,
    acknowledgedBy: null,
  };
}

function advanceTrainingJobs(
  jobs: { status: string; progressPct: number; updatedAt: string }[],
) {
  for (const job of jobs) {
    if (job.status === "deployed" || job.status === "failed") continue;
    const step = 1 + Math.random() * 4;
    job.progressPct = Math.min(100, job.progressPct + step);
    job.updatedAt = new Date().toISOString();

    if (job.progressPct >= 100) {
      job.status =
        job.status === "collecting"
          ? "training"
          : job.status === "training"
            ? "evaluating"
            : job.status === "evaluating"
              ? "ready"
              : job.status === "ready"
                ? "deployed"
                : job.status;
      if (job.status !== "deployed") job.progressPct = 0;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
