import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import type { LatLng as LatLngType } from "../lib/geo";

// Iconos personalizados
const pickupIcon = divIcon({
  className: "custom-div-icon",
  html: `<div style="background-color: #ffd200; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #0d0d0d;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const dropoffIcon = divIcon({
  className: "custom-div-icon",
  html: `<div style="background-color: #ffffff; width: 14px; height: 14px; border-radius: 3px; border: 3px solid #0d0d0d;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function MapUpdater({ center, driverPos }: { center: LatLngType; driverPos?: LatLngType }) {
  const map = useMap();
  useEffect(() => {
    const pos = driverPos || center;
    map.setView([pos.lat, pos.lng], map.getZoom());
  }, [center, driverPos, map]);
  return null;
}

interface Props {
  center: LatLngType;
  zoom?: number;
  pickup?: LatLngType;
  dropoff?: LatLngType;
  route?: LatLngType[];
  driver?: { pos: LatLngType; heading: number } | null;
  follow?: boolean;
}

export function MapView({ center, zoom = 15, pickup, dropoff, route, driver, follow }: Props) {
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = '&copy; OpenStreetMap &copy; CARTO';

  const driverIcon = driver
    ? divIcon({
        className: "custom-div-icon",
        html: `<div style="transform: rotate(${driver.heading}deg); color: #ffd200;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                 </svg>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
    : undefined;

  return (
    <div className="absolute inset-0 bg-surface z-0">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full"
        style={{ background: "#0d0d0d" }}
      >
        <TileLayer attribution={attribution} url={tileUrl} />
        <MapUpdater center={center} driverPos={follow && driver ? driver.pos : undefined} />
        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
        {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}
        {driver && driverIcon && <Marker position={[driver.pos.lat, driver.pos.lng]} icon={driverIcon} />}
        {route && route.length > 1 && (
          <Polyline
            pathOptions={{ color: "#ffd200", weight: 5, opacity: 0.9 }}
            positions={route.map((p) => [p.lat, p.lng] as [number, number])}
          />
        )}
      </MapContainer>
    </div>
  );
}
