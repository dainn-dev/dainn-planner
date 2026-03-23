import { Smile, FileText, Headphones, User, Star, Heart, Camera, Coffee, Book, Code, Briefcase, Award, Check, Clock, Cloud, Download, Edit, Eye, Gift, Globe, Key, Lock, Mail, Map, Music, Phone, Search, Settings, Shield, ShoppingCart, Tag, Trash2, Upload, Zap } from "lucide-react"

export const FACT_ICONS = {
  Smile,
  FileText,
  Headphones,
  User,
  Star,
  Heart,
  Camera,
  Coffee,
  Book,
  Code,
  Briefcase,
  Award,
  Check,
  Clock,
  Cloud,
  Download,
  Edit,
  Eye,
  Gift,
  Globe,
  Key,
  Lock,
  Mail,
  Map,
  Music,
  Phone,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  Trash2,
  Upload,
  Zap,
} as const

export type FactIconName = keyof typeof FACT_ICONS

export const FACT_ICON_OPTIONS = Object.keys(FACT_ICONS) as FactIconName[] 