// TODO(notarization): delete this component (and its one use in
// components/MacDownload.tsx) once the macOS build is signed with a Developer
// ID certificate and notarized by Apple. Until then Gatekeeper blocks the app
// on first open and people need these steps.

export function UnnotarizedNote() {
  return (
    <p role="note" className="max-w-md text-[13px] leading-relaxed text-ink-2">
      This build is not yet notarized. If macOS blocks it, open System Settings → Privacy &amp; Security
      and choose <strong className="font-semibold text-ink">Open Anyway</strong>. (On macOS 14 or earlier,
      right-click the app and choose Open.)
    </p>
  )
}
