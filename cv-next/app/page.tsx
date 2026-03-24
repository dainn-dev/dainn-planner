import { getPublicCvPayload } from "@/lib/server/public-cv"
import MarketingHome from "@/components/marketing-home"
import SiteUnavailable from "@/components/site-unavailable"
import MaintenancePage from "@/components/maintenance-page"
import CvPublicPage from "@/components/cv-public-page"

export default async function Home() {
  const payload = await getPublicCvPayload()

  if (payload.kind === "marketing") {
    return <MarketingHome />
  }

  if (payload.kind === "maintenance") {
    return <MaintenancePage slug={payload.slug} />
  }

  if (payload.kind === "unavailable") {
    return <SiteUnavailable slug={payload.slug} />
  }

  return (
    <CvPublicPage
      presetKey={payload.theme.presetKey}
      tokens={payload.theme.tokens}
      content={payload.content}
    />
  )
}
