/**
 * Remotion bundle entry — referenced by `npx remotion lambda sites create`.
 * This must be a side-effect import that registers the root composition.
 */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
