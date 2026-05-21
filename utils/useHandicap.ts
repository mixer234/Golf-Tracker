import { useUserStore } from '../store/useUserStore';
import { getTerminology, TermKey } from './getTerminology';

export function useHandicap(): number {
  return useUserStore((s) => s.profile?.handicap ?? 36);
}

export function useTerminology(): (key: TermKey) => string {
  const handicap = useHandicap();
  return (key: TermKey) => getTerminology(handicap, key);
}
