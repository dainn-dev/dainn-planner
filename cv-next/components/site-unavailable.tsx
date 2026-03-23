export default function SiteUnavailable({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Site not available</h1>
        <p className="text-slate-400">
          <span className="font-mono">{slug}</span> is not published yet or does not exist.
        </p>
      </div>
    </div>
  )
}
