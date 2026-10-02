import { HttpResponse, http, delay, type RequestHandler } from "msw";

import type { AlertThresholds, Severity } from "@/api/types";
import * as db from "./db";
import { irFrameSvg, landmarksSvg } from "./frames";

const API = "/api";

/** Small artificial latency so loading states are visible in dev. */
async function latency() {
  if (import.meta.env.MODE === "test") return;
  await delay(120 + Math.random() * 260);
}

function parseSeverity(param: string | null): Severity[] | undefined {
  if (!param) return undefined;
  const allowed: Severity[] = ["alert", "mild", "drowsy", "critical"];
  const parsed = param
    .split(",")
    .filter((s): s is Severity => allowed.includes(s as Severity));
  return parsed.length ? parsed : undefined;
}

export const handlers: RequestHandler[] = [
  http.get(`${API}/fleet/stats`, async () => {
    await latency();
    return HttpResponse.json(db.getFleetStats());
  }),

  // ─── Vehicles ──────────────────────────────────────────────────────────────
  http.get(`${API}/vehicles`, async () => {
    await latency();
    return HttpResponse.json(db.listVehicles());
  }),
  http.get(`${API}/vehicles/:id`, async ({ params }) => {
    await latency();
    const vehicle = db.getVehicle(String(params.id));
    return vehicle
      ? HttpResponse.json(vehicle)
      : HttpResponse.json({ message: "Veículo não encontrado" }, { status: 404 });
  }),

  // ─── Drivers ───────────────────────────────────────────────────────────────
  http.get(`${API}/drivers`, async () => {
    await latency();
    return HttpResponse.json(db.listDrivers());
  }),
  http.get(`${API}/drivers/:id`, async ({ params }) => {
    await latency();
    const driver = db.getDriver(String(params.id));
    return driver
      ? HttpResponse.json(driver)
      : HttpResponse.json({ message: "Motorista não encontrado" }, { status: 404 });
  }),
  http.get(`${API}/drivers/:id/history`, async ({ params }) => {
    await latency();
    return HttpResponse.json(db.getDriverHistory(String(params.id)));
  }),

  // ─── Devices ───────────────────────────────────────────────────────────────
  http.get(`${API}/devices`, async () => {
    await latency();
    return HttpResponse.json(db.listDevices());
  }),
  http.get(`${API}/devices/:id`, async ({ params }) => {
    await latency();
    const device = db.getDevice(String(params.id));
    return device
      ? HttpResponse.json(device)
      : HttpResponse.json({ message: "Dispositivo não encontrado" }, { status: 404 });
  }),
  http.post(`${API}/devices/:id/sync`, async ({ params }) => {
    await latency();
    const device = db.forceDeviceSync(String(params.id));
    return device
      ? HttpResponse.json(device)
      : HttpResponse.json({ message: "Dispositivo não encontrado" }, { status: 404 });
  }),

  // ─── Events ────────────────────────────────────────────────────────────────
  http.get(`${API}/events`, async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const p = url.searchParams;
    const result = db.queryEvents({
      page: p.get("page") ? Number(p.get("page")) : undefined,
      pageSize: p.get("pageSize") ? Number(p.get("pageSize")) : undefined,
      severity: parseSeverity(p.get("severity")),
      driverId: p.get("driverId") ?? undefined,
      vehicleId: p.get("vehicleId") ?? undefined,
      acknowledged:
        p.get("acknowledged") === null ? undefined : p.get("acknowledged") === "true",
      from: p.get("from") ?? undefined,
      to: p.get("to") ?? undefined,
      sort: (p.get("sort") as "timestamp" | "score" | "severity" | null) ?? undefined,
      dir: (p.get("dir") as "asc" | "desc" | null) ?? undefined,
    });
    return HttpResponse.json(result);
  }),
  http.get(`${API}/events/:id`, async ({ params }) => {
    await latency();
    const event = db.getEvent(String(params.id));
    return event
      ? HttpResponse.json(event)
      : HttpResponse.json({ message: "Alerta não encontrado" }, { status: 404 });
  }),
  http.post(`${API}/events/:id/acknowledge`, async ({ params, request }) => {
    await latency();
    const body = (await request.json().catch(() => ({}))) as { by?: string };
    const event = db.acknowledgeEvent(
      String(params.id),
      body.by ?? "Central de Operações",
    );
    return event
      ? HttpResponse.json(event)
      : HttpResponse.json({ message: "Alerta não encontrado" }, { status: 404 });
  }),

  // ─── Trips (só existem na API real; no mock a lista é vazia) ───────────────
  http.get(`${API}/trips`, async () => {
    await latency();
    return HttpResponse.json([]);
  }),
  http.get(`${API}/trips/:id`, async () => {
    await latency();
    return HttpResponse.json({ message: "Viagem não encontrada" }, { status: 404 });
  }),

  // ─── ML ────────────────────────────────────────────────────────────────────
  http.get(`${API}/models`, async () => {
    await latency();
    return HttpResponse.json(db.listModelVersions());
  }),
  http.get(`${API}/models/:id`, async ({ params }) => {
    await latency();
    const model = db.getModelVersion(String(params.id));
    return model
      ? HttpResponse.json(model)
      : HttpResponse.json({ message: "Modelo não encontrado" }, { status: 404 });
  }),
  http.get(`${API}/training-jobs`, async () => {
    await latency();
    return HttpResponse.json(db.listTrainingJobs());
  }),
  http.get(`${API}/training-jobs/:id`, async ({ params }) => {
    await latency();
    const job = db.getTrainingJob(String(params.id));
    return job
      ? HttpResponse.json(job)
      : HttpResponse.json({ message: "Treinamento não encontrado" }, { status: 404 });
  }),

  // ─── Settings ──────────────────────────────────────────────────────────────
  http.get(`${API}/settings/thresholds`, async () => {
    await latency();
    return HttpResponse.json(db.getThresholds());
  }),
  http.put(`${API}/settings/thresholds`, async ({ request }) => {
    await latency();
    const patch = (await request.json()) as Partial<AlertThresholds>;
    return HttpResponse.json(db.updateThresholds(patch));
  }),

  // ─── Frame placeholders ────────────────────────────────────────────────────
  http.get(`${API}/frames/:id/ir.svg`, ({ params }) => {
    return new HttpResponse(irFrameSvg(String(params.id)), {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }),
  http.get(`${API}/frames/:id/landmarks.svg`, ({ params }) => {
    return new HttpResponse(landmarksSvg(String(params.id)), {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }),
];
