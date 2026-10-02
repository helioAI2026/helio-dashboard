import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { startLiveSimulation } from "./live";
import { queryKeys } from "@/api/queries";
import * as db from "./db";
import type { TrainingJob, Vehicle } from "@/api/types";

describe("startLiveSimulation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("patches the vehicles cache and moves online trucks on each tick", () => {
    const qc = new QueryClient();
    const before = structuredClone(db.listVehicles());
    qc.setQueryData(queryKeys.vehicles, before);

    const stop = startLiveSimulation(qc);
    vi.advanceTimersByTime(4_000 * 3);
    stop();

    const after = qc.getQueryData<Vehicle[]>(queryKeys.vehicles)!;
    expect(after).not.toBe(before);

    const onlineId = before.find((v) => v.status === "online")!.id;
    const movedBefore = before.find((v) => v.id === onlineId)!;
    const movedAfter = after.find((v) => v.id === onlineId)!;
    expect(
      movedAfter.location.lat !== movedBefore.location.lat ||
        movedAfter.location.lng !== movedBefore.location.lng,
    ).toBe(true);
  });

  it("advances non-terminal training jobs", () => {
    const qc = new QueryClient();
    const job = db
      .listTrainingJobs()
      .find((j) => j.status !== "deployed" && j.status !== "failed")!;
    const startedProgress = job.progressPct;
    const startedStatus = job.status;

    const stop = startLiveSimulation(qc);
    vi.advanceTimersByTime(4_000 * 2);
    stop();

    const updated = qc
      .getQueryData<TrainingJob[]>(queryKeys.trainingJobs)!
      .find((j) => j.id === job.id)!;

    const progressed =
      updated.progressPct > startedProgress || updated.status !== startedStatus;
    expect(progressed).toBe(true);
  });
});
