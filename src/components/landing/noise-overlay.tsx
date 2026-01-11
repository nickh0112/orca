'use client';

export function NoiseOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]">
      <svg className="w-full h-full">
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.80"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}
