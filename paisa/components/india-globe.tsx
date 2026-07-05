"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629, altitude: 1.6 };

const CITIES = [
  { name: "Delhi",     lat: 28.6139, lng: 77.2090, size: 0.55 },
  { name: "Mumbai",    lat: 19.0760, lng: 72.8777, size: 0.55 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946, size: 0.45 },
  { name: "Kolkata",   lat: 22.5726, lng: 88.3639, size: 0.45 },
  { name: "Chennai",   lat: 13.0827, lng: 80.2707, size: 0.45 },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867, size: 0.4  },
  { name: "Pune",      lat: 18.5204, lng: 73.8567, size: 0.35 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, size: 0.35 },
  { name: "Jaipur",    lat: 26.9124, lng: 75.7873, size: 0.3  },
  { name: "Surat",     lat: 21.1702, lng: 72.8311, size: 0.3  },
];

const ARCS = [
  { startLat: 28.6139, startLng: 77.2090, endLat: 19.0760, endLng: 72.8777 },
  { startLat: 19.0760, startLng: 72.8777, endLat: 12.9716, endLng: 77.5946 },
  { startLat: 12.9716, startLng: 77.5946, endLat: 13.0827, endLng: 80.2707 },
  { startLat: 13.0827, startLng: 80.2707, endLat: 22.5726, endLng: 88.3639 },
  { startLat: 22.5726, startLng: 88.3639, endLat: 28.6139, endLng: 77.2090 },
  { startLat: 17.3850, startLng: 78.4867, endLat: 19.0760, endLng: 72.8777 },
  { startLat: 23.0225, startLng: 72.5714, endLat: 28.6139, endLng: 77.2090 },
  { startLat: 28.6139, startLng: 77.2090, endLat: 22.5726, endLng: 88.3639 },
];

export function IndiaGlobe() {
  const globeRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  function handleGlobeReady() {
    if (!globeRef.current) return;
    globeRef.current.pointOfView(INDIA_CENTER, 0);
    const ctrl = globeRef.current.controls();
    if (ctrl) {
      ctrl.autoRotate = true;
      ctrl.autoRotateSpeed = 0.35;
      ctrl.enableZoom = false;
      ctrl.enablePan = false;
      ctrl.minPolarAngle = Math.PI / 3;
      ctrl.maxPolarAngle = Math.PI / 1.5;
    }

    // Make the globe sphere white + semi-transparent
    try {
      const scene = globeRef.current.scene();
      scene.traverse((obj: any) => {
        if (!obj.isMesh) return;
        const geo = obj.geometry;
        if (!geo) return;
        const isGlobeSphere =
          geo.type === "SphereGeometry" ||
          geo.type === "SphereBufferGeometry" ||
          (geo.parameters && geo.parameters.radius > 50);
        if (isGlobeSphere && obj.material) {
          // Remove earth texture
          obj.material.map = null;
          obj.material.bumpMap = null;
          // White, semi-transparent
          obj.material.color.setHex(0xffffff);
          obj.material.opacity = 0.1;
          obj.material.transparent = true;
          obj.material.needsUpdate = true;
        }
      });
    } catch (_) { /* ignore if Three.js traversal fails */ }

    setLoaded(true);
  }

  return (
    <div
      className="w-full flex items-center justify-center overflow-hidden relative"
      style={{ height: 680 }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-zinc-600 animate-spin" />
        </div>
      )}
      <Globe
        ref={globeRef}
        width={700}
        height={680}
        backgroundColor="rgba(0,0,0,0)"
        onGlobeReady={handleGlobeReady}
        /* texture is cleared in onGlobeReady, but keep a URL so the material
           initialises properly before we override it */
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        atmosphereColor="rgba(180,180,180,0.4)"
        atmosphereAltitude={0.18}
      />
    </div>
  );
}
