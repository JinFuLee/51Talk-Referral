import { gmScene } from './gm';
import { opsDirectorScene } from './ops-director';
import { crosscheckScene } from './crosscheck';
import type { Audience, SceneConfig, SlideConfig, Timeframe } from '../types';

export const scenes: Record<Audience, SceneConfig> = {
  gm: gmScene,
  'ops-director': opsDirectorScene,
  crosscheck: crosscheckScene,
};

export function getSceneConfig(audience: Audience): SceneConfig {
  return scenes[audience];
}

export function getSlides(audience: Audience, timeframe: Timeframe): SlideConfig[] {
  const scene = scenes[audience];
  if (!scene.availableTimeframes.includes(timeframe)) {
    return [];
  }
  return scene.slides[timeframe] ?? [];
}

export function isTimeframeAvailable(audience: Audience, timeframe: Timeframe): boolean {
  return scenes[audience].availableTimeframes.includes(timeframe);
}

export { gmScene, opsDirectorScene, crosscheckScene };
export type { Audience, SceneConfig, SlideConfig, Timeframe };
