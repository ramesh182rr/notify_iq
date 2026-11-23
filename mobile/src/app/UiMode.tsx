import { createContext, useContext, type PropsWithChildren } from 'react';

/** Simple view: fewer, larger elements for people who want the essentials. Full view shows everything. */
export type UiMode = { simple: boolean; setSimple: (simple: boolean) => void };

const UiModeContext = createContext<UiMode>({ simple: false, setSimple: () => undefined });

export function UiModeProvider({ value, children }: PropsWithChildren<{ value: UiMode }>) {
  return <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>;
}

export function useUiMode(): UiMode {
  return useContext(UiModeContext);
}
