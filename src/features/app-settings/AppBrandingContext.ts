import { createContext } from 'react'

export interface AppBrandingContextValue {
  appName: string
  iconUrl: string | null
  primaryColor: string
  loading: boolean
  refresh: () => Promise<void>
}

export const AppBrandingContext = createContext<AppBrandingContextValue | undefined>(undefined)
