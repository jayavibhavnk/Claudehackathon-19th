import type { ExerciseAnimationData } from './schemas/pose'
import { SEATED_HAMSTRING, STANDING_QUAD, SEATED_SHOULDER_ER } from '../remotion/demoKeyframes'

// Fallback animations keyed by exercise position
export const DEMO_ANIMATIONS: Record<string, ExerciseAnimationData> = {
  seated: {
    keyframes: SEATED_HAMSTRING,
    label: 'Seated Stretch',
    highlightParts: ['hamstring'],
    supportObject: 'chair',
  },
  standing: {
    keyframes: STANDING_QUAD,
    label: 'Standing Stretch',
    highlightParts: ['quad'],
    supportObject: null,
  },
  lying_supine: {
    keyframes: SEATED_HAMSTRING,
    label: 'Floor Exercise',
    highlightParts: ['hamstring'],
    supportObject: 'floor',
  },
  lying_prone: {
    keyframes: STANDING_QUAD,
    label: 'Floor Exercise',
    highlightParts: ['quad'],
    supportObject: 'floor',
  },
  side_lying: {
    keyframes: SEATED_SHOULDER_ER,
    label: 'Side Exercise',
    highlightParts: ['shoulder'],
    supportObject: 'floor',
  },
  other: {
    keyframes: SEATED_SHOULDER_ER,
    label: 'Exercise',
    highlightParts: ['shoulder'],
    supportObject: null,
  },
}
