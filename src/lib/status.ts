import type {
  CameraStatus,
  Connectivity,
  ModelStatus,
  TrainingJobStatus,
  VehicleStatus,
} from "@/api/types";
import type { StatusTone } from "@/components/common/StatusBadge";

type Descriptor = { tone: StatusTone; label: string };

export const VEHICLE_STATUS: Record<VehicleStatus, Descriptor> = {
  online: { tone: "ok", label: "Em rota" },
  idle: { tone: "warn", label: "Parado" },
  offline: { tone: "neutral", label: "Offline" },
};

export const CAMERA_STATUS: Record<CameraStatus, Descriptor> = {
  ok: { tone: "ok", label: "Câmera OK" },
  degraded: { tone: "warn", label: "Câmera degradada" },
  offline: { tone: "danger", label: "Câmera offline" },
};

export const CONNECTIVITY_STATUS: Record<Connectivity, Descriptor> = {
  online: { tone: "ok", label: "Conectado" },
  offline: { tone: "danger", label: "Sem conexão" },
};

export const MODEL_STATUS: Record<ModelStatus, Descriptor> = {
  candidate: { tone: "info", label: "Candidato" },
  staged: { tone: "warn", label: "Implantação gradual" },
  deployed: { tone: "ok", label: "Em produção" },
  archived: { tone: "neutral", label: "Arquivado" },
};

export const TRAINING_STATUS: Record<TrainingJobStatus, Descriptor> = {
  collecting: { tone: "info", label: "Coletando quadros" },
  queued: { tone: "neutral", label: "Na fila" },
  training: { tone: "info", label: "Treinando" },
  evaluating: { tone: "warn", label: "Avaliando" },
  ready: { tone: "ok", label: "Pronto para liberar" },
  failed: { tone: "danger", label: "Falhou" },
  deployed: { tone: "ok", label: "Implantado" },
};

export const TRIGGER_LABEL: Record<string, string> = {
  "eye-closure": "Olhos fechados",
  yawn: "Bocejo",
  "head-nod": "Cabeça caindo",
  perclos: "PERCLOS alto",
  "gaze-off-road": "Olhar fora da via",
};
