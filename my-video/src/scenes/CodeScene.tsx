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
  Paper,
  PencilLayer,
  SketchCanvas,
  Stroke,
  useBoil,
} from "../sketch/Sketch";
import { roughEllipse, roughLine, roughRect, rocketParts } from "../sketch/rough";

type Props = {
  readonly title: string;
  readonly style?: React.CSSProperties;
};

const K: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: ACCENT }}>{children}</span>
);

const CodeSceneInner: React.FC<Props> = ({ title, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const b = useBoil();

  // The preview rocket only takes off once the code is "written"
  const rocketY = interpolate(frame, [62, 86], [640, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 0.3, 1),
  });
  const rocket = rocketParts(1540, rocketY, 0.85, 300 + b);
  const previewIn = drawProgress(frame, 10, 16);

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
          {/* Code editor window */}
          <Stroke d={roughRect(140, 260, 1060, 540, 200 + b)} progress={drawProgress(frame, 6, 16)} width={5} />
          <Stroke d={roughLine([140, 322], [1200, 322], 201 + b)} progress={drawProgress(frame, 14, 8)} />
          {[0, 1, 2].map((i) => (
            <Stroke
              key={i}
              d={roughEllipse(180 + i * 36, 291, 10, 10, 210 + i + b, 1.5)}
              progress={drawProgress(frame, 16 + i * 2, 5)}
              color={i === 0 ? ACCENT : undefined}
            />
          ))}

          {/* Live preview frame */}
          <Stroke d={roughRect(1300, 260, 480, 540, 220 + b)} progress={previewIn} width={5} />
          {[
            [1360, 330],
            [1720, 420],
            [1400, 560],
            [1690, 700],
          ].map(([sx, sy], i) => (
            <Stroke
              key={`s${i}`}
              d={roughLine([sx - 10, sy], [sx + 10, sy], 230 + i + b, 1.5, 1) + roughLine([sx, sy - 10], [sx, sy + 10], 240 + i + b, 1.5, 1)}
              progress={drawProgress(frame, 20 + i * 2, 4)}
              opacity={0.6}
            />
          ))}
          <Stroke d={rocket.body} progress={drawProgress(frame, 24, 12)} />
          <Stroke d={rocket.window} progress={drawProgress(frame, 32, 5)} />
          <Stroke d={rocket.fins} progress={drawProgress(frame, 34, 6)} />
          <Stroke d={rocket.flame} progress={drawProgress(frame, 62, 4)} color={ACCENT} width={5} />
        </SketchCanvas>

        <HandText progress={drawProgress(frame, 1, 4)} x={1540} y={196} fontSize={48} weight={400} align="center">
          preview
        </HandText>

        <HandText progress={drawProgress(frame, 22, 12)} x={190} y={360} fontSize={58} pencil>
          <K>const</K> frame = useCurrentFrame();
        </HandText>
        <HandText progress={drawProgress(frame, 34, 12)} x={190} y={450} fontSize={58} pencil>
          <K>const</K> y = interpolate(frame,
        </HandText>
        <HandText progress={drawProgress(frame, 46, 8)} x={270} y={540} fontSize={58} pencil>
          [0, 90], [700, 120]);
        </HandText>
        <HandText progress={drawProgress(frame, 54, 10)} x={190} y={630} fontSize={58} pencil>
          <K>return</K> {"<Rocket top={y} />;"}
        </HandText>
      </PencilLayer>
    </Paper>
  );
};

const codeSceneSchema = {
  title: { type: "text-content", default: "", description: "Headline" },
} as const satisfies InteractivitySchema;

export const CodeScene = Interactive.withSchema({
  Component: CodeSceneInner,
  componentName: "<CodeScene>",
  schema: codeSceneSchema,
  wrapInSequence: true,
});
