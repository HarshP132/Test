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
import { roughEllipse, roughLine, roughPoly, scribble } from "../sketch/rough";

type Props = {
  readonly title: string;
  readonly prompt: string;
  readonly style?: React.CSSProperties;
};

const PromptSceneInner: React.FC<Props> = ({ title, prompt, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const b = useBoil();
  const [line1, line2] = splitInTwo(prompt);

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
          {/* Underline under the headline */}
          <Stroke
            d={scribble([[165, 225], [600, 218], [1000, 228]], 7 + b, 3)}
            progress={drawProgress(frame, 14, 10)}
            color={ACCENT}
            width={6}
          />
          {/* The person typing */}
          <Stroke d={roughEllipse(250, 470, 46, 46, 20 + b)} progress={drawProgress(frame, 16, 12)} />
          <Stroke
            d={scribble([[175, 640], [190, 560], [250, 535], [310, 560], [325, 640]], 21 + b)}
            progress={drawProgress(frame, 22, 12)}
          />
          {/* Chat bubble */}
          <Stroke
            d={roughPoly(
              [[380, 320], [1640, 320], [1640, 640], [520, 640], [440, 710], [460, 640], [380, 640]],
              30 + b,
            )}
            progress={drawProgress(frame, 12, 26)}
            width={5}
          />
          {/* Send button */}
          <Stroke
            d={roughEllipse(1720, 720, 52, 52, 40 + b)}
            progress={drawProgress(frame, 80, 10)}
            color={ACCENT}
            width={5}
          />
          <Stroke
            d={roughPoly([[1698, 695], [1752, 720], [1698, 745]], 41 + b, true, 2)}
            progress={drawProgress(frame, 84, 8)}
            color={ACCENT}
            width={5}
          />
          {/* "Sent!" burst */}
          {[0, 1, 2, 3, 4].map((i) => {
            const a = -Math.PI / 2 + (i - 2) * 0.55;
            return (
              <Stroke
                key={i}
                d={roughLine(
                  [1720 + Math.cos(a) * 72, 720 + Math.sin(a) * 72],
                  [1720 + Math.cos(a) * 105, 720 + Math.sin(a) * 105],
                  50 + i + b,
                  2,
                )}
                progress={drawProgress(frame, 90 + i, 5)}
                color={ACCENT}
                width={5}
              />
            );
          })}
        </SketchCanvas>
        <HandText progress={drawProgress(frame, 38, 26)} x={440} y={370} fontSize={84} pencil>
          {line1}
        </HandText>
        <HandText progress={drawProgress(frame, 64, 14)} x={440} y={480} fontSize={84} pencil>
          {line2}
        </HandText>
      </PencilLayer>
    </Paper>
  );
};

const splitInTwo = (text: string): [string, string] => {
  const words = text.split(" ");
  const half = Math.ceil(words.length * 0.62);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
};

const promptSceneSchema = {
  title: { type: "text-content", default: "", description: "Headline" },
  prompt: { type: "text-content", default: "", description: "Prompt text" },
} as const satisfies InteractivitySchema;

export const PromptScene = Interactive.withSchema({
  Component: PromptSceneInner,
  componentName: "<PromptScene>",
  schema: promptSceneSchema,
  wrapInSequence: true,
});
