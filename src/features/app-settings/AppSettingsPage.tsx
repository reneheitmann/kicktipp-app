import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../auth/useAuth'
import { useAppBranding } from './useAppBranding'
import { getAppSettings, saveAppSettings, uploadAppIcon } from './appSettingsApi'

const DEFAULT_APP_NAME = 'Kicktipp Spielrunde'
const DEFAULT_PRIMARY_COLOR = '#0f172a'

export function AppSettingsPage() {
  const { profile } = useAuth()
  const { refresh } = useAppBranding()

  const [loading, setLoading] = useState(true)
  const [appName, setAppName] = useState(DEFAULT_APP_NAME)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)

  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAppSettings()
      .then((settings) => {
        setAppName(settings.app_name)
        setIconUrl(settings.icon_url)
        setPrimaryColor(settings.primary_color)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Einstellungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Bitte eine Bilddatei auswählen (PNG, JPG, SVG, …).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Datei zu groß (max. 2 MB).')
      return
    }
    setUploadingIcon(true)
    setError(null)
    try {
      const url = await uploadAppIcon(file)
      setIconUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Icon konnte nicht hochgeladen werden.')
    } finally {
      setUploadingIcon(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      await saveAppSettings({
        app_name: appName.trim() || DEFAULT_APP_NAME,
        icon_url: iconUrl,
        primary_color: primaryColor,
        updated_by: profile.id,
      })
      await refresh()
      setInfo('Einstellungen gespeichert.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Einstellungen konnten nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  function handleResetDefaults() {
    setAppName(DEFAULT_APP_NAME)
    setIconUrl(null)
    setPrimaryColor(DEFAULT_PRIMARY_COLOR)
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Erscheinungsbild</h1>

      <form className="max-w-xl space-y-6 rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-700">{info}</p>}

        <div>
          <label htmlFor="app-name" className="mb-1 block text-sm font-medium text-slate-700">
            App-Name
          </label>
          <input
            id="app-name"
            required
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Erscheint in der Seitenleiste, im mobilen Header, auf der Login-Seite und als Browser-Tab-Titel.
          </p>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Icon (Browser-Favicon)</span>
          <div className="flex items-center gap-3">
            <img
              src={iconUrl ?? '/icon.png'}
              alt="Aktuelles Icon"
              className="h-12 w-12 rounded-lg border border-slate-200 object-contain"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleIconChange}
              disabled={uploadingIcon}
              className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            {uploadingIcon && <span className="text-sm text-slate-500">Lädt hoch...</span>}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Wirkt sofort auf das Browser-Favicon. Das separate Docker-/Unraid-Container-Icon ist davon nicht
            betroffen – das bleibt fest im Docker-Image hinterlegt und ändert sich nur mit einem neuen
            Code-Deployment.
          </p>
        </div>

        <div>
          <label htmlFor="primary-color" className="mb-1 block text-sm font-medium text-slate-700">
            Primärfarbe
          </label>
          <div className="flex items-center gap-3">
            <input
              id="primary-color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300"
            />
            <input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              placeholder="#0f172a"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Wirkt auf Buttons und die aktive Menü-Hervorhebung. Überschriften/Text bleiben unverändert dunkel.
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Speichert...' : 'Speichern'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleResetDefaults} disabled={saving}>
            Zurücksetzen auf Standard
          </Button>
        </div>
      </form>
    </div>
  )
}
