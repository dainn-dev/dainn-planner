import { getPublicCvPayload } from "@/lib/server/public-cv"
import MarketingHome from "@/components/marketing-home"
import SiteUnavailable from "@/components/site-unavailable"
import CvPublicPage from "@/components/cv-public-page"

export default async function Home() {
  const payload = await getPublicCvPayload()

  if (payload.kind === "marketing") {
    return <MarketingHome />
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
