import { useWorld } from '../store'
import { getLook } from './looks'

/** The current look's mood: sky, fog, light and water colours. */
export const useMood = () => getLook(useWorld((s) => s.look)).mood

/** The whole current look. */
export const useLook = () => getLook(useWorld((s) => s.look))
