import React from "react";
import {
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import {
  ACCENT,
  drawProgress,
  HandText,
  INK,
  Paper,
  PencilLayer,
  SketchCanvas,
  Stroke,
  useBoil,
} from "../sketch/Sketch";
import {
  hatchRect,
  roughLine,
  roughPoly,
  roughRect,
  rocketParts,
} from "../sketch/rough";

type Props = {
  readonly title: string;
  readonly fileName: string;
  readonly style?: React.CSSProperties;
};

const STRIP_TOP = 280;
const STRIP_H = 270;
const CELL = 320;
const BAR = { x: 360, y: 700, w: 1200, h: 64 };
const TOTAL_FRAMES = 450;

const RenderSceneInner: React.FC<Props> = ({ title, fileName, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const b = useBoil();

  const scroll = frame * 13;
  const firstCell = Math.floor(scroll / CELL) - 1;
  const cells = Array.from({ length: 9 }, (_, i) => firstCell + i);

  const render = interpolate(frame, [18, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0, 0.4, 1),
  });
  const contentsIn = drawProgress(frame, 8, 10);

  return (
    <Paper style={style}>
      <PencilLayer
        style={{
          opacity: interpolate(
            frame,
            [durationInFrames - 8, durationInFrames],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          ),
        }}
      >
        <HandText progress={drawProgress(frame, 0, 18)} x={160} y={90} fontSize={104} pencil>
          {title}
        </HandText>
        <SketchCanvas>
          <defs>
            <clipPath id="barClip">
              <rect x={BAR.x} y={BAR.y} width={BAR.w * render} height={BAR.h} />
            </clipPath>
          </defs>

          {/* Film strip edges */}
          <Stroke d={roughLine([-40, STRIP_TOP], [1960, STRIP_TOP], 400 + b, 4)} progress={drawProgress(frame, 2, 12)} width={5} />
          <Stroke d={roughLine([-40, STRIP_TOP + STRIP_H], [1960, STRIP_TOP + STRIP_H], 401 + b, 4)} progress={drawProgress(frame, 4, 12)} width={5} />

          {/* Scrolling frames, each with the rocket a little higher */}
          <g opacity={contentsIn}>
            {cells.map((k) => {
              const x = 40 + k * CELL - scroll;
              const lift = ((k % 6) + 6) % 6;
              const r = rocketParts(x + CELL / 2, STRIP_TOP + 178 - lift * 14, 0.55, k * 13 + b);
              return (
                <g key={k}>
                  <Stroke d={roughLine([x, STRIP_TOP + 40], [x, STRIP_TOP + STRIP_H - 40], k * 7 + b, 2, 1)} progress={1} />
                  {[0, 1, 2, 3].map((h) => (
                    <Stroke
                      key={h}
                      d={
                        roughRect(x + 30 + h * 72, STRIP_TOP + 10, 30, 18, k * 31 + h + b, 1.5) +
                        roughRect(x + 30 + h * 72, STRIP_TOP + STRIP_H - 28, 30, 18, k * 37 + h + b, 1.5)
                      }
                      progress={1}
                      width={2.5}
                      opacity={0.6}
                    />
                  ))}
                  <Stroke d={r.body} progress={1} width={3.5} />
                  <Stroke d={r.fins} progress={1} width={3.5} />
                  <Stroke d={r.flame} progress={1} width={3.5} color={ACCENT} />
                </g>
              );
            })}
          </g>

          {/* Progress bar with hatched pencil fill */}
          <Stroke d={roughRect(BAR.x, BAR.y, BAR.w, BAR.h, 420 + b)} progress={drawProgress(frame, 10, 12)} width={5} />
          <g clipPath="url(#barClip)">
            <Stroke d={hatchRect(BAR.x, BAR.y, BAR.w, BAR.h, 430 + b, 12)} progress={1} color={ACCENT} width={4} opacity={0.85} />
          </g>

          {/* Done! check mark */}
          <Stroke
            d={roughPoly([[1600, 735], [1630, 768], [1690, 690]], 440 + b, false, 2)}
            progress={drawProgress(frame, 72, 8)}
            color={ACCENT}
            width={8}
          />
        </SketchCanvas>

        <div
          style={{
            position: "absolute",
            left: BAR.x,
            top: BAR.y + BAR.h + 14,
            fontSize: 52,
            fontWeight: 700,
            color: INK,
            opacity: drawProgress(frame, 16, 6),
          }}
        >
          frame {Math.round(render * TOTAL_FRAMES)} / {TOTAL_FRAMES}
        </div>
        <HandText progress={drawProgress(frame, 74, 10)} x={1220} y={BAR.y + BAR.h + 14} fontSize={52} pencil>
          {fileName}
        </HandText>
      </PencilLayer>
    </Paper>
  );
};

const renderSceneSchema = {
  title: { type: "text-content", default: "", description: "Headline" },
  fileName: { type: "text-content", default: "", description: "Output file" },
} as const satisfies InteractivitySchema;

export const RenderScene = Interactive.withSchema({
  Component: RenderSceneInner,
  componentName: "<RenderScene>",
  schema: renderSceneSchema,
  wrapInSequence: true,
});
