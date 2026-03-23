import { Briefcase, ClipboardList, BarChart, TelescopeIcon as Binoculars, Sun, Calendar } from "lucide-react"

export const SERVICE_ICONS = {
  Briefcase,
  ClipboardList,
  BarChart,
  Binoculars,
  Sun,
  Calendar,
} as const

export type ServiceIconName = keyof typeof SERVICE_ICONS

export const SERVICE_ICON_OPTIONS = Object.keys(SERVICE_ICONS) as ServiceIconName[] 