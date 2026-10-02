import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { LoginPage } from "@/features/auth/LoginPage";
import { RouteError } from "@/features/misc/RouteError";
import { NotFoundPage } from "@/features/misc/NotFoundPage";

const FleetOverviewPage = lazy(() =>
  import("@/features/overview/FleetOverviewPage").then((m) => ({
    default: m.FleetOverviewPage,
  })),
);
const FleetMapPage = lazy(() =>
  import("@/features/map/FleetMapPage").then((m) => ({ default: m.FleetMapPage })),
);
const AlertsPage = lazy(() =>
  import("@/features/alerts/AlertsPage").then((m) => ({ default: m.AlertsPage })),
);
const DriversPage = lazy(() =>
  import("@/features/drivers/DriversPage").then((m) => ({ default: m.DriversPage })),
);
const DriverDetailPage = lazy(() =>
  import("@/features/drivers/DriverDetailPage").then((m) => ({
    default: m.DriverDetailPage,
  })),
);
const DevicesPage = lazy(() =>
  import("@/features/devices/DevicesPage").then((m) => ({ default: m.DevicesPage })),
);
const DeviceDetailPage = lazy(() =>
  import("@/features/devices/DeviceDetailPage").then((m) => ({
    default: m.DeviceDetailPage,
  })),
);
const ModelVersionsPage = lazy(() =>
  import("@/features/mlops/ModelVersionsPage").then((m) => ({
    default: m.ModelVersionsPage,
  })),
);
const ModelVersionDetailPage = lazy(() =>
  import("@/features/mlops/ModelVersionDetailPage").then((m) => ({
    default: m.ModelVersionDetailPage,
  })),
);
const TrainingJobsPage = lazy(() =>
  import("@/features/mlops/TrainingJobsPage").then((m) => ({
    default: m.TrainingJobsPage,
  })),
);
const RolloutPage = lazy(() =>
  import("@/features/mlops/RolloutPage").then((m) => ({ default: m.RolloutPage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const ComponentGalleryPage = lazy(() =>
  import("@/features/_gallery/ComponentGalleryPage").then((m) => ({
    default: m.ComponentGalleryPage,
  })),
);

export const router = createBrowserRouter([
  {
    path: "/entrar",
    element: <LoginPage />,
    errorElement: <RouteError />,
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <FleetOverviewPage /> },
          { path: "mapa", element: <FleetMapPage /> },
          { path: "alertas", element: <AlertsPage /> },
          { path: "alertas/:alertId", element: <AlertsPage /> },
          { path: "motoristas", element: <DriversPage /> },
          { path: "motoristas/:driverId", element: <DriverDetailPage /> },
          { path: "dispositivos", element: <DevicesPage /> },
          { path: "dispositivos/:deviceId", element: <DeviceDetailPage /> },
          { path: "ml", element: <Navigate to="/ml/modelos" replace /> },
          { path: "ml/modelos", element: <ModelVersionsPage /> },
          { path: "ml/modelos/:modelId", element: <ModelVersionDetailPage /> },
          { path: "ml/treinamentos", element: <TrainingJobsPage /> },
          { path: "ml/implantacao", element: <RolloutPage /> },
          { path: "configuracoes", element: <SettingsPage /> },
          ...(import.meta.env.DEV
            ? [{ path: "_galeria", element: <ComponentGalleryPage /> }]
            : []),
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
