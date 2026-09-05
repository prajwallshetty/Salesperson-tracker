"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MapContainer, type MapContainerProps } from "react-leaflet";

interface SafeMapContainerProps extends MapContainerProps {
  children: ReactNode;
}

export function LeafletMapContainer({ children, style, className, ...props }: SafeMapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mapKey, setMapKey] = useState<string>("");

  useEffect(() => {
    setMapKey("leaflet-map-" + Math.random().toString(36).substring(2, 9));
    setIsMounted(true);

    return () => {
      const el = containerRef.current;
      if (el) {
        delete (el as any)._leaflet_id;
        const containers = el.getElementsByClassName("leaflet-container");
        for (let i = 0; i < containers.length; i++) {
          delete (containers[i] as any)._leaflet_id;
        }
      }
    };
  }, []);

  if (!isMounted || !mapKey) {
    return <div className={className ?? "h-full w-full bg-muted/20"} style={style ?? { height: "100%", width: "100%" }} />;
  }

  return (
    <div ref={containerRef} key={mapKey} className={className ?? "h-full w-full"} style={style ?? { height: "100%", width: "100%" }}>
      <MapContainer key={mapKey} style={{ height: "100%", width: "100%" }} {...props}>
        {children}
      </MapContainer>
    </div>
  );
}
