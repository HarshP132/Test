import React, { useId } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/fonts";

// Caveat (Google Fonts, OFL) bundled locally as a variable font: one file, all weights
export const handFont = "Caveat";
loadFont({
  family: handFont,
  url: staticFile("fonts/Caveat-latin.woff2"),
  weight: "400 700",
});

export const INK = "#2d2a26";
export const ACCENT = "#e0703a";
export const PAPER = "#f3eee2";

// Lines "boil" (re-jitter) every few frames, like hand-drawn animation
export const useBoil = (every = 4) => Math.floor(useCurrentFrame() / every);

// 0 → 1 drawing progress between two frames
export const drawProgress = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.25, 1),
  });

const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "");

// Paper background with JS-generated grain and a soft vignette
export const Paper: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const id = cleanId(useId());
  return (
    <AbsoluteFill
      style={{ backgroundColor: PAPER, fontFamily: handFont, ...style }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute" }}>
        <filter id={`paper${id}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            seed="11"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.09 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#paper${id})`} />
      </svg>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(70,55,30,0.18) 100%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

// Applies a JS/SVG pencil-grain filter to everything inside (strokes + text)
export const PencilLayer: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const id = `pencil${cleanId(useId())}`;
  const boil = useBoil(4);
  return (
    <AbsoluteFill style={style}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <PencilFilterDef id={id} seed={boil} />
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Full-frame SVG drawing surface in 1920x1080 coordinates
export const SketchCanvas: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <svg
    viewBox="0 0 1920 1080"
    width="100%"
    height="100%"
    style={{ position: "absolute", inset: 0, overflow: "visible" }}
  >
    {children}
  </svg>
);

const PencilFilterDef: React.FC<{ id: string; seed: number }> = ({
  id,
  seed,
}) => (
  <defs>
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.04"
        numOctaves="2"
        seed={seed % 7}
        result="warp"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="warp"
        scale="3"
        xChannelSelector="R"
        yChannelSelector="G"
        result="wobble"
      />
      <feTurbulence
        type="fractalNoise"
        baseFrequency="1.4"
        numOctaves="1"
        seed={(seed % 5) + 3}
        result="grain"
      />
      <feColorMatrix
        in="grain"
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.45"
        result="grainAlpha"
      />
      <feComposite in="wobble" in2="grainAlpha" operator="in" />
    </filter>
  </defs>
);

// One pencil stroke that draws itself on as `progress` goes 0 → 1
export const Stroke: React.FC<{
  d: string;
  progress: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({ d, progress, color = INK, width = 4, opacity = 0.9 }) => {
  if (progress <= 0.001) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - progress}
    />
  );
};

// A little drawn pencil whose graphite tip sits at (0, 0)
export const PencilIcon: React.FC<{ size?: number; tilt?: number }> = ({
  size = 1,
  tilt = 0,
}) => (
  <svg
    width={1}
    height={1}
    style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
  >
    <g transform={`rotate(${-50 + tilt}) scale(${size})`}>
      <path d="M0 0 L30 -10 L30 10 Z" fill="#e9c99a" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M0 0 L10 -3.5 L10 3.5 Z" fill={INK} />
      <rect x={30} y={-10} width={130} height={20} fill={ACCENT} stroke={INK} strokeWidth={2.5} />
      <line x1={30} y1={-3} x2={160} y2={-3} stroke={INK} strokeWidth={1.2} opacity={0.4} />
      <line x1={30} y1={4} x2={160} y2={4} stroke={INK} strokeWidth={1.2} opacity={0.4} />
      <rect x={160} y={-10} width={16} height={20} fill="#b9b4a8" stroke={INK} strokeWidth={2.5} />
      <rect x={176} y={-10} width={20} height={20} rx={5} fill="#e79a9a" stroke={INK} strokeWidth={2.5} />
    </g>
  </svg>
);

// Handwritten text that is revealed left → right, optionally with a pencil
export const HandText: React.FC<{
  children: React.ReactNode;
  progress: number;
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
  weight?: number;
  pencil?: boolean;
  align?: "left" | "center";
}> = ({
  children,
  progress,
  x,
  y,
  fontSize = 64,
  color = INK,
  weight = 700,
  pencil = false,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  if (progress <= 0.001) return null;
  const writing = pencil && progress < 0.999;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: align === "center" ? "-50% 0" : undefined,
        whiteSpace: "pre",
        fontFamily: handFont,
        fontSize,
        fontWeight: weight,
        lineHeight: 1.1,
        color,
      }}
    >
      <div
        style={{
          // Extra right margin when finished so slanted letters are not clipped
          clipPath: `inset(-30% ${(1 - progress) * 110 - 10}% -30% -5%)`,
        }}
      >
        {children}
      </div>
      {writing ? (
        <div
          style={{
            position: "absolute",
            left: `${progress * 100}%`,
            top: fontSize * (0.75 + 0.12 * Math.sin(frame * 1.7)),
          }}
        >
          <PencilIcon size={fontSize / 80} tilt={Math.sin(frame * 0.9) * 4} />
        </div>
      ) : null}
    </div>
  );
};
