import { createContext, useContext } from 'react'
import type { SavedInstance } from '../lib/instanceStore'

interface MobileInstanceContextValue {
  activeInstance: SavedInstance
  switchInstance: () => void
}

/**
 * Nur innerhalb des mobile-Kanals bereitgestellt (siehe MobileApp.tsx) –
 * `useMobileInstance()` liefert im Web-Build immer `null`, da dort nie ein
 * Provider im Baum steht. MyAccountPage.tsx nutzt das, um den Menüpunkt
 * "Instanz wechseln" nur auf mobile anzuzeigen, ohne das Web-Layout zu
 * verändern.
 */
export const MobileInstanceContext = createContext<MobileInstanceContextValue | null>(null)

export function useMobileInstance(): MobileInstanceContextValue | null {
  return useContext(MobileInstanceContext)
}
