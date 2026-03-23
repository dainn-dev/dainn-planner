import { Twitter, Facebook, Instagram, Linkedin, Github, Youtube, Twitch, Dribbble, Globe, Globe2 } from "lucide-react"

export const SOCIAL_PLATFORM_OPTIONS = [
  "Twitter",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "GitHub",
  "YouTube",
  "TikTok",
  "Pinterest",
  "Reddit",
  "Discord",
  "Twitch",
  "Medium",
  "Behance",
  "Dribbble",
  "Other"
] as const

export type SocialPlatformName = typeof SOCIAL_PLATFORM_OPTIONS[number]

export const SOCIAL_PLATFORMS: Record<SocialPlatformName, typeof Twitter> = {
  Twitter,
  Facebook,
  Instagram,
  LinkedIn: Linkedin,
  GitHub: Github,
  YouTube: Youtube,
  Twitch,
  Dribbble,
  Behance: Globe,
  Pinterest: Globe,
  Reddit: Globe,
  Discord: Globe,
  Medium: Globe,
  TikTok: Globe,
  Other: Globe2,
} 