import React from "react";
import {
  Easing,
  interpolate,
  Interactive,
  useCurrentFrame,
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
import { hatchRect, roughEllipse, roughLine, roughPoly } from "../sketch/rough";

type Props = {
  readonly headline: string;
  readonly credit: string;
  readonly style?: React.CSSProperties;
};

const CX = 960;
const CY = 380;
const TRI: [number, number][] = [
  [CX - 50, CY - 75],
  [CX + 85, CY],
  [CX - 50, CY + 75],
];

const OutroSceneInner: React.FC<Props> = ({ headline, credit, style }) => {
  const frame = useCurrentFrame();
  const b = useBoil();
  const pop = interpolate(frame, [0, 14], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.spring({ damping: 12 }),
    output: "perceptual-scale",
  });

  return (
    <Paper style={style}>
      <PencilLayer>
        <SketchCanvas>
          <defs>
            <clipPath id="playClip">
              <polygon points={TRI.map((p) => p.join(",")).join(" ")} />
            </clipPath>
          </defs>
          <g style={{ scale: pop, transformOrigin: `${CX}px ${CY}px` }}>
            <Stroke d={roughEllipse(CX, CY, 170, 170, 500 + b, 5)} progress={drawProgress(frame, 0, 16)} width={7} />
            <Stroke d={roughPoly(TRI, 510 + b, true, 3)} progress={drawProgress(frame, 8, 12)} width={6} color={ACCENT} />
            <g clipPath="url(#playClip)">
              <Stroke d={hatchRect(CX - 60, CY - 80, 150, 160, 520 + b, 13)} progress={drawProgress(frame, 16, 12)} width={4} color={ACCENT} />
            </g>
            {/* Little motion ticks around the button */}
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2 + 0.3;
              return (
                <Stroke
                  key={i}
                  d={roughLine(
                    [CX + Math.cos(a) * 205, CY + Math.sin(a) * 205],
                    [CX + Math.cos(a) * 245, CY + Math.sin(a) * 245],
                    530 + i + b,
                    2,
                  )}
                  progress={drawProgress(frame, 18 + i, 5)}
                  width={5}
                />
              );
            })}
          </g>
        </SketchCanvas>
        <HandText progress={drawProgress(frame, 14, 20)} x={960} y={620} fontSize={130} align="center" pencil>
          {headline}
        </HandText>
        <HandText progress={drawProgress(frame, 32, 14)} x={960} y={800} fontSize={60} weight={400} align="center">
          {credit}
        </HandText>
      </PencilLayer>
    </Paper>
  );
};

const outroSceneSchema = {
  headline: { type: "text-content", default: "", description: "Headline" },
  credit: { type: "text-content", default: "", description: "Credit line" },
} as const satisfies InteractivitySchema;

export const OutroScene = Interactive.withSchema({
  Component: OutroSceneInner,
  componentName: "<OutroScene>",
  schema: outroSceneSchema,
  wrapInSequence: true,
});
