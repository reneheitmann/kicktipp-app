import { useContext } from 'react'
import { AppBrandingContext } from './AppBrandingContext'

export function useAppBranding() {
  const ctx = useContext(AppBrandingContext)
  if (!ctx) {
    throw new Error('useAppBranding muss innerhalb von <AppBrandingProvider> verwendet werden')
  }
  return ctx
}
