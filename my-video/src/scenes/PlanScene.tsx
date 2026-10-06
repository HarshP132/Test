import React from "react";
import {
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
  Paper,
  PencilLayer,
  SketchCanvas,
  Stroke,
  useBoil,
} from "../sketch/Sketch";
import {
  hatchRect,
  roughEllipse,
  roughLine,
  roughPoly,
  roughRect,
  rocketParts,
  scribble,
} from "../sketch/rough";

type Props = {
  readonly title: string;
  readonly style?: React.CSSProperties;
};

const PANEL_X = [200, 760, 1320];
const PANEL_Y = 290;
const PANEL_W = 400;
const PANEL_H = 300;
const CAPTIONS = ["Launch", "Fly", "Land"];

const PlanSceneInner: React.FC<Props> = ({ title, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const b = useBoil();
  const panelStart = (i: number) => 14 + i * 22;

  const r1 = rocketParts(PANEL_X[0] + 200, PANEL_Y + 160, 1, 100 + b);
  const r2 = rocketParts(0, 0, 0.8, 110 + b);
  const moonCx = PANEL_X[2] + 210;
  const moonCy = PANEL_Y + 175;

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
        <HandText progress={drawProgress(frame, 0, 20)} x={160} y={90} fontSize={104} pencil>
          {title}
        </HandText>
        <SketchCanvas>
          <defs>
            <clipPath id="moonClip">
              <circle cx={moonCx} cy={moonCy} r={84} />
            </clipPath>
          </defs>

          {PANEL_X.map((x, i) => (
            <Stroke
              key={`panel${i}`}
              d={roughRect(x, PANEL_Y, PANEL_W, PANEL_H, 60 + i * 3 + b)}
              progress={drawProgress(frame, panelStart(i), 14)}
              width={5}
            />
          ))}

          {/* Arrows between panels */}
          {[0, 1].map((i) => {
            const x1 = PANEL_X[i] + PANEL_W + 20;
            const x2 = PANEL_X[i + 1] - 20;
            const y = PANEL_Y + PANEL_H / 2;
            const p = drawProgress(frame, panelStart(i + 1) - 4, 10);
            return (
              <g key={`arrow${i}`}>
                <Stroke d={roughLine([x1, y], [x2, y], 80 + i + b, 3)} progress={p} color={ACCENT} width={6} />
                <Stroke
                  d={roughPoly([[x2 - 26, y - 20], [x2, y], [x2 - 26, y + 20]], 90 + i + b, false, 2)}
                  progress={drawProgress(frame, panelStart(i + 1) + 4, 5)}
                  color={ACCENT}
                  width={6}
                />
              </g>
            );
          })}

          {/* Panel 1: rocket on the launch pad */}
          <Stroke d={roughLine([PANEL_X[0] + 40, PANEL_Y + 255], [PANEL_X[0] + 360, PANEL_Y + 255], 120 + b)} progress={drawProgress(frame, 24, 8)} />
          <Stroke d={r1.body} progress={drawProgress(frame, 26, 14)} />
          <Stroke d={r1.window} progress={drawProgress(frame, 34, 6)} />
          <Stroke d={r1.fins} progress={drawProgress(frame, 36, 8)} />

          {/* Panel 2: rocket flying with a trail and stars */}
          <g transform={`translate(${PANEL_X[1] + 250} ${PANEL_Y + 120}) rotate(35)`}>
            <Stroke d={r2.body} progress={drawProgress(frame, 48, 14)} />
            <Stroke d={r2.window} progress={drawProgress(frame, 56, 6)} />
            <Stroke d={r2.fins} progress={drawProgress(frame, 58, 8)} />
            <Stroke d={r2.flame} progress={drawProgress(frame, 62, 8)} color={ACCENT} width={5} />
          </g>
          <Stroke
            d={scribble(
              [
                [PANEL_X[1] + 40, PANEL_Y + 280],
                [PANEL_X[1] + 110, PANEL_Y + 240],
                [PANEL_X[1] + 160, PANEL_Y + 250],
                [PANEL_X[1] + 205, PANEL_Y + 195],
              ],
              130 + b,
            )}
            progress={drawProgress(frame, 62, 10)}
            color={ACCENT}
            width={4}
          />
          {[
            [PANEL_X[1] + 60, PANEL_Y + 60],
            [PANEL_X[1] + 340, PANEL_Y + 250],
            [PANEL_X[1] + 110, PANEL_Y + 150],
          ].map(([sx, sy], i) => (
            <Stroke
              key={`star${i}`}
              d={roughLine([sx - 12, sy], [sx + 12, sy], 140 + i + b, 1.5, 1) + roughLine([sx, sy - 12], [sx, sy + 12], 150 + i + b, 1.5, 1)}
              progress={drawProgress(frame, 64 + i * 2, 5)}
            />
          ))}

          {/* Panel 3: the moon with shading, craters and a flag */}
          <Stroke d={roughEllipse(moonCx, moonCy, 84, 84, 160 + b)} progress={drawProgress(frame, 66, 12)} width={5} />
          <g clipPath="url(#moonClip)">
            <Stroke
              d={hatchRect(moonCx - 100, moonCy - 100, 200, 200, 170 + b, 16)}
              progress={drawProgress(frame, 74, 12)}
              width={2.5}
              opacity={0.45}
            />
          </g>
          <Stroke d={roughEllipse(moonCx - 30, moonCy - 25, 18, 14, 180 + b, 2)} progress={drawProgress(frame, 76, 6)} />
          <Stroke d={roughEllipse(moonCx + 35, moonCy + 30, 24, 18, 181 + b, 2)} progress={drawProgress(frame, 78, 6)} />
          <Stroke d={roughLine([moonCx + 30, moonCy - 78], [moonCx + 30, moonCy - 140], 190 + b, 2)} progress={drawProgress(frame, 80, 5)} />
          <Stroke
            d={roughPoly([[moonCx + 30, moonCy - 140], [moonCx + 80, moonCy - 125], [moonCx + 30, moonCy - 110]], 191 + b, false, 2)}
            progress={drawProgress(frame, 83, 5)}
            color={ACCENT}
            width={5}
          />
        </SketchCanvas>

        {CAPTIONS.map((c, i) => (
          <HandText
            key={c}
            progress={drawProgress(frame, panelStart(i) + 18, 10)}
            x={PANEL_X[i] + PANEL_W / 2}
            y={PANEL_Y + PANEL_H + 24}
            fontSize={64}
            align="center"
          >
            {c}
          </HandText>
        ))}
      </PencilLayer>
    </Paper>
  );
};

const planSceneSchema = {
  title: { type: "text-content", default: "", description: "Headline" },
} as const satisfies InteractivitySchema;

export const PlanScene = Interactive.withSchema({
  Component: PlanSceneInner,
  componentName: "<PlanScene>",
  schema: planSceneSchema,
  wrapInSequence: true,
});
