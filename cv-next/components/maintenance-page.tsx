import { ServerCrash } from "lucide-react"

export default function MaintenancePage({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
            <ServerCrash className="w-10 h-10 text-slate-400" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">Under Maintenance</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            <span className="font-mono text-slate-300">{slug}</span> is temporarily unavailable.
            The server is down for maintenance. Please try again in a few minutes.
          </p>
        </div>

        <p className="text-xs text-slate-600">Refresh this page to check again.</p>
      </div>
    </div>
  )
}
