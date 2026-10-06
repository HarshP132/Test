import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CodeScene } from "./scenes/CodeScene";
import { OutroScene } from "./scenes/OutroScene";
import { PlanScene } from "./scenes/PlanScene";
import { PromptScene } from "./scenes/PromptScene";
import { RenderScene } from "./scenes/RenderScene";
import {
  ACCENT,
  drawProgress,
  handFont,
  INK,
  PencilLayer,
  SketchCanvas,
  Stroke,
  useBoil,
} from "./sketch/Sketch";
import { roughEllipse, roughLine, roughPoly } from "./sketch/rough";

// Scene start frames (30 fps)
const STEPS = [
  { label: "Prompt", from: 0, x: 600 },
  { label: "Plan", from: 105, x: 840 },
  { label: "Code", from: 210, x: 1080 },
  { label: "Render", from: 300, x: 1320 },
];
const OUTRO_FROM = 390;
const STEP_Y = 948;

const StepTracker: React.FC = () => {
  const frame = useCurrentFrame();
  const b = useBoil();
  const active = STEPS.reduce((acc, s, i) => (frame >= s.from ? i : acc), 0);
  return (
    <PencilLayer
      style={{
        opacity: interpolate(frame, [OUTRO_FROM - 8, OUTRO_FROM], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <SketchCanvas>
        {STEPS.slice(0, -1).map((s, i) => {
          const x1 = s.x + 70;
          const x2 = STEPS[i + 1].x - 70;
          const p = drawProgress(frame, 4 + i * 4, 8);
          return (
            <g key={s.label} opacity={0.55}>
              <Stroke d={roughLine([x1, STEP_Y], [x2, STEP_Y], 600 + i + b, 2)} progress={p} width={3} />
              <Stroke d={roughPoly([[x2 - 14, STEP_Y - 10], [x2, STEP_Y], [x2 - 14, STEP_Y + 10]], 610 + i + b, false, 1.5)} progress={p} width={3} />
            </g>
          );
        })}
        <Stroke
          key={active}
          d={roughEllipse(STEPS[active].x, STEP_Y, 84, 38, 620 + active * 3 + b, 3)}
          progress={drawProgress(frame, STEPS[active].from + 4, 12)}
          color={ACCENT}
          width={5}
        />
      </SketchCanvas>
      {STEPS.map((s, i) => (
        <div
          key={s.label}
          style={{
            position: "absolute",
            left: s.x,
            top: STEP_Y - 32,
            translate: "-50% 0",
            fontFamily: handFont,
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1,
            color: i === active ? INK : "rgba(45,42,38,0.4)",
            opacity: drawProgress(frame, i * 4, 8),
          }}
        >
          {s.label}
        </div>
      ))}
    </PencilLayer>
  );
};

export const SketchExplainer: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <PromptScene
        name="Prompt"
        from={0}
        durationInFrames={105}
        premountFor={fps}
        title="You describe the video"
        prompt="“Make a 15-second video of a rocket flying to the moon”"
      />
      <PlanScene
        name="Plan"
        from={105}
        durationInFrames={105}
        premountFor={fps}
        title="Opus 5.5 plans the story"
      />
      <CodeScene
        name="Code"
        from={210}
        durationInFrames={90}
        premountFor={fps}
        title="It writes the animation in JavaScript"
      />
      <RenderScene
        name="Render"
        from={300}
        durationInFrames={90}
        premountFor={fps}
        title="Remotion renders every frame"
        fileName="video.mp4"
      />
      <OutroScene
        name="Outro"
        from={390}
        durationInFrames={60}
        premountFor={fps}
        headline="Prompt → Video"
        credit="drawn entirely in code by Opus 5.5 + Remotion"
      />
      <StepTracker />
    </AbsoluteFill>
  );
};
