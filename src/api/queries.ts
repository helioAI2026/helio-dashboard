import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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
  Trip,
  TripDetail,
} from "@/api/types";
import { apiGet, apiPost, apiPut } from "@/api/client";

export type EventFilters = {
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

export type TripFilters = {
  driverId?: string;
  from?: string;
  to?: string;
};

export const queryKeys = {
  fleetStats: ["fleet", "stats"] as const,
  vehicles: ["vehicles"] as const,
  vehicle: (id: string) => ["vehicles", id] as const,
  drivers: ["drivers"] as const,
  driver: (id: string) => ["drivers", id] as const,
  devices: ["devices"] as const,
  device: (id: string) => ["devices", id] as const,
  events: (filters: EventFilters) => ["events", filters] as const,
  event: (id: string) => ["events", "detail", id] as const,
  trips: (filters: TripFilters) => ["trips", filters] as const,
  trip: (id: string) => ["trips", "detail", id] as const,
  models: ["models"] as const,
  model: (id: string) => ["models", id] as const,
  trainingJobs: ["training-jobs"] as const,
  trainingJob: (id: string) => ["training-jobs", id] as const,
  thresholds: ["settings", "thresholds"] as const,
};

function eventsQueryString(filters: EventFilters): string {
  const p = new URLSearchParams();
  if (filters.page) p.set("page", String(filters.page));
  if (filters.pageSize) p.set("pageSize", String(filters.pageSize));
  if (filters.severity?.length) p.set("severity", filters.severity.join(","));
  if (filters.driverId) p.set("driverId", filters.driverId);
  if (filters.vehicleId) p.set("vehicleId", filters.vehicleId);
  if (typeof filters.acknowledged === "boolean")
    p.set("acknowledged", String(filters.acknowledged));
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.sort) p.set("sort", filters.sort);
  if (filters.dir) p.set("dir", filters.dir);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export function useFleetStats() {
  return useQuery({
    queryKey: queryKeys.fleetStats,
    queryFn: () => apiGet<FleetStats>("/api/fleet/stats"),
    refetchInterval: 20_000,
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: () => apiGet<Vehicle[]>("/api/vehicles"),
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicle(id ?? ""),
    queryFn: () => apiGet<Vehicle>(`/api/vehicles/${id}`),
    enabled: Boolean(id),
  });
}

export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers,
    queryFn: () => apiGet<Driver[]>("/api/drivers"),
  });
}

export function useDriver(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.driver(id ?? ""),
    queryFn: () => apiGet<Driver>(`/api/drivers/${id}`),
    enabled: Boolean(id),
  });
}

export function useDriverHistory(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.driver(id ?? ""), "history"] as const,
    queryFn: () => apiGet<{ t: string; score: number }[]>(`/api/drivers/${id}/history`),
    enabled: Boolean(id),
  });
}

export function useDevices() {
  return useQuery({
    queryKey: queryKeys.devices,
    queryFn: () => apiGet<Device[]>("/api/devices"),
  });
}

export function useDevice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.device(id ?? ""),
    queryFn: () => apiGet<Device>(`/api/devices/${id}`),
    enabled: Boolean(id),
  });
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: queryKeys.events(filters),
    queryFn: () =>
      apiGet<Paginated<DrowsinessEvent>>(`/api/events${eventsQueryString(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.event(id ?? ""),
    queryFn: () => apiGet<DrowsinessEvent>(`/api/events/${id}`),
    enabled: Boolean(id),
  });
}

export function useTrips(filters: TripFilters) {
  const p = new URLSearchParams();
  if (filters.driverId) p.set("driverId", filters.driverId);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  const qs = p.toString();
  return useQuery({
    queryKey: queryKeys.trips(filters),
    queryFn: () => apiGet<Trip[]>(`/api/trips${qs ? `?${qs}` : ""}`),
    enabled: Boolean(filters.driverId),
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trip(id ?? ""),
    queryFn: () => apiGet<TripDetail>(`/api/trips/${id}`),
    enabled: Boolean(id),
  });
}

export function useModelVersions() {
  return useQuery({
    queryKey: queryKeys.models,
    queryFn: () => apiGet<ModelVersion[]>("/api/models"),
  });
}

export function useModelVersion(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.model(id ?? ""),
    queryFn: () => apiGet<ModelVersion>(`/api/models/${id}`),
    enabled: Boolean(id),
  });
}

export function useTrainingJobs() {
  return useQuery({
    queryKey: queryKeys.trainingJobs,
    queryFn: () => apiGet<TrainingJob[]>("/api/training-jobs"),
    refetchInterval: 15_000,
  });
}

export function useTrainingJob(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trainingJob(id ?? ""),
    queryFn: () => apiGet<TrainingJob>(`/api/training-jobs/${id}`),
    enabled: Boolean(id),
  });
}

export function useThresholds() {
  return useQuery({
    queryKey: queryKeys.thresholds,
    queryFn: () => apiGet<AlertThresholds>("/api/settings/thresholds"),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useAcknowledgeEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, by }: { id: string; by?: string }) =>
      apiPost<DrowsinessEvent>(`/api/events/${id}/acknowledge`, { by }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.event(updated.id), updated);
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: queryKeys.fleetStats });
    },
  });
}

export function useForceDeviceSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<Device>(`/api/devices/${id}/sync`),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.device(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.devices });
    },
  });
}

export function useUpdateThresholds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AlertThresholds>) =>
      apiPut<AlertThresholds>("/api/settings/thresholds", patch),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.thresholds, updated);
    },
  });
}
