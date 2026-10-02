import { useCallback, useMemo, useRef } from "react";
import Map, {
  Layer,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type {
  CircleLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Vehicle } from "@/api/types";
import { SEVERITY_HEX } from "@/lib/severity";

const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const SEVERITY_MATCH = [
  "match",
  ["get", "severity"],
  "alert",
  SEVERITY_HEX.alert,
  "mild",
  SEVERITY_HEX.mild,
  "drowsy",
  SEVERITY_HEX.drowsy,
  "critical",
  SEVERITY_HEX.critical,
  "#94a3b8",
] as const;

const clusterLayer: CircleLayerSpecification = {
  id: "clusters",
  type: "circle",
  source: "fleet",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#1f6feb",
    "circle-opacity": 0.25,
    "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 15, 30],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#6ea3d8",
  },
};

const clusterCountLayer: SymbolLayerSpecification = {
  id: "cluster-count",
  type: "symbol",
  source: "fleet",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
  },
  paint: { "text-color": "#e6e9ed" },
};

const alertGlowLayer: CircleLayerSpecification = {
  id: "vehicle-glow",
  type: "circle",
  source: "fleet",
  filter: ["all", ["!", ["has", "point_count"]], ["get", "isAlert"]],
  paint: {
    "circle-color": SEVERITY_MATCH as unknown as string,
    "circle-opacity": 0.18,
    "circle-radius": 16,
  },
};

const vehicleLayer: CircleLayerSpecification = {
  id: "vehicles",
  type: "circle",
  source: "fleet",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": SEVERITY_MATCH as unknown as string,
    "circle-radius": ["case", ["get", "isAlert"], 7, 5],
    "circle-stroke-width": ["case", ["get", "selected"], 3, 1.5],
    "circle-stroke-color": ["case", ["get", "selected"], "#ffffff", "#0d0f12"],
    "circle-opacity": ["case", ["get", "offline"], 0.4, 1],
  },
};

type FleetMapProps = {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function FleetMap({ vehicles, selectedId, onSelect }: FleetMapProps) {
  const mapRef = useRef<MapRef>(null);

  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: vehicles.map((v) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [v.location.lng, v.location.lat] },
        properties: {
          id: v.id,
          plate: v.plate,
          severity: v.currentSeverity,
          isAlert:
            v.currentSeverity === "drowsy" || v.currentSeverity === "critical",
          offline: v.status === "offline",
          selected: v.id === selectedId,
        },
      })),
    }),
    [vehicles, selectedId],
  );

  const initialView = useMemo(() => {
    if (!vehicles.length) return { longitude: -47, latitude: -21, zoom: 5 };
    const lngs = vehicles.map((v) => v.location.lng);
    const lats = vehicles.map((v) => v.location.lat);
    return {
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      zoom: 4.4,
    };
  }, [vehicles]);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) {
        onSelect(null);
        return;
      }
      if (feature.properties?.point_count) {
        const clusterId = feature.properties.cluster_id as number;
        const source = mapRef.current?.getSource("fleet");
        // @ts-expect-error getClusterExpansionZoom exists on GeoJSONSource
        source?.getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
          if (err) return;
          mapRef.current?.easeTo({
            center: (feature.geometry as Point).coordinates as [number, number],
            zoom,
            duration: 500,
          });
        });
        return;
      }
      onSelect(String(feature.properties?.id));
    },
    [onSelect],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={initialView}
      mapStyle={BASEMAP_STYLE}
      interactiveLayerIds={["clusters", "vehicles", "vehicle-glow"]}
      onClick={handleClick}
      cursor="auto"
      style={{ position: "absolute", inset: 0 }}
    >
      <Source
        id="fleet"
        type="geojson"
        data={data}
        cluster
        clusterRadius={44}
        clusterMaxZoom={7}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...alertGlowLayer} />
        <Layer {...vehicleLayer} />
      </Source>
    </Map>
  );
}
