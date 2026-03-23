import { z } from "zod"

/** Full CV document body for PUT /api/me/site/content */
export const cvContentPutSchema = z.object({
  profile: z.unknown().optional(),
  portfolio: z.unknown().optional(),
  skills: z.unknown().optional(),
  testimonials: z.unknown().optional(),
  facts: z.unknown().optional(),
  services: z.unknown().optional(),
  education: z.unknown().optional(),
  experience: z.unknown().optional(),
  certificates: z.unknown().optional(),
})

export type CvContentInput = z.infer<typeof cvContentPutSchema>

export type CvContentDocument = {
  profile: unknown
  portfolio: unknown
  skills: unknown
  testimonials: unknown
  facts: unknown
  services: unknown
  education: unknown
  experience: unknown
  certificates: unknown
}

export function emptyCvDocument(): CvContentDocument {
  return {
    profile: null,
    portfolio: { intro: { title: "", description: "" }, items: [] },
    skills: {
      intro: { title: "", description: "" },
      technicalSkills: [],
      softSkills: [],
    },
    testimonials: { intro: { title: "", description: "" }, testimonials: [] },
    facts: { intro: { title: "", description: "" }, facts: [] },
    services: { intro: { title: "", description: "" }, services: [] },
    education: [],
    experience: [],
    certificates: [],
  }
}

export function rowToCvDoc(row: {
  profile: unknown
  portfolio: unknown
  skills: unknown
  testimonials: unknown
  facts: unknown
  services: unknown
  education: unknown
  experience: unknown
  certificates: unknown
}): CvContentDocument {
  const empty = emptyCvDocument()
  return {
    profile: row.profile ?? empty.profile,
    portfolio: row.portfolio ?? empty.portfolio,
    skills: row.skills ?? empty.skills,
    testimonials: row.testimonials ?? empty.testimonials,
    facts: row.facts ?? empty.facts,
    services: row.services ?? empty.services,
    education: row.education ?? empty.education,
    experience: row.experience ?? empty.experience,
    certificates: row.certificates ?? empty.certificates,
  }
}
