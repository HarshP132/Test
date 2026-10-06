import "./index.css";
import { Composition, Folder } from "remotion";
import { SketchExplainer } from "./SketchExplainer";
import { PromptScene } from "./scenes/PromptScene";
import { PlanScene } from "./scenes/PlanScene";
import { CodeScene } from "./scenes/CodeScene";
import { RenderScene } from "./scenes/RenderScene";
import { OutroScene } from "./scenes/OutroScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SketchExplainer"
        component={SketchExplainer}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Prompt"
          component={PromptScene}
          durationInFrames={105}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            title: "You describe the video",
            prompt: "“Make a 15-second video of a rocket flying to the moon”",
          }}
        />
        <Composition
          id="Plan"
          component={PlanScene}
          durationInFrames={105}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ title: "Opus 5.5 plans the story" }}
        />
        <Composition
          id="Code"
          component={CodeScene}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ title: "It writes the animation in JavaScript" }}
        />
        <Composition
          id="Render"
          component={RenderScene}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            title: "Remotion renders every frame",
            fileName: "video.mp4",
          }}
        />
        <Composition
          id="Outro"
          component={OutroScene}
          durationInFrames={60}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            headline: "Prompt → Video",
            credit: "drawn entirely in code by Opus 5.5 + Remotion",
          }}
        />
      </Folder>
    </>
  );
};
