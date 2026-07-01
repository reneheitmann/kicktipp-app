export function UnauthorizedPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Kein Zugriff</h1>
      <p className="text-sm text-slate-500">
        Du hast nicht die erforderliche Rolle, um diesen Bereich zu sehen.
      </p>
    </div>
  )
}
