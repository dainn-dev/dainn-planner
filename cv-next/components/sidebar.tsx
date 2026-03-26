"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Home,
  User,
  Info,
  Sparkles,
  Building2,
  GraduationCap,
  Award,
  Briefcase,
  Server,
  MessageSquare,
  Mail,
  Menu,
} from "lucide-react"
import { useCvContentFromApi } from "@/components/cv-content-context"
import { SOCIAL_PLATFORMS, type SocialPlatformName } from "@/lib/constants/social-platforms"
import { getAssetFullUrl } from "@/lib/api/cv"

type Social = { platform: string; url: string; icon?: string }

export default function Sidebar() {
  const apiCv = useCvContentFromApi()
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("hero")
  const [profileData, setProfileData] = useState<{
    name: string
    image: string
    socials: Social[]
  }>({
    name: "Your Name",
    image: "",
    socials: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = apiCv?.content?.profile as { name?: string; image?: string; socials?: Social[] } | null | undefined
    if (p && typeof p === "object") {
      setProfileData({
        name: p.name || "Your Name",
        image: p.image || "",
        socials: p.socials || [],
      })
    }
    setLoading(false)
  }, [apiCv])

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section")
      let current = ""

      sections.forEach((section) => {
        const sectionTop = section.offsetTop
        const sectionHeight = section.clientHeight
        if (window.scrollY >= sectionTop - 200) {
          current = section.getAttribute("id") || ""
        }
      })

      if (current) {
        setActiveSection(current)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <button
        className="fixed top-4 right-4 z-50 p-2 bg-primary text-white rounded-md md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-6 w-6" />
      </button>

      <header
        className={`fixed top-0 left-0 bottom-0 w-72 bg-[#040b14] text-white transition-transform duration-300 ease-in-out z-40 
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="profile p-6 text-center">
            {loading ? (
              <div className="animate-pulse">
                <div className="mx-auto rounded-full border-8 border-[#2c2f3f] w-[120px] h-[120px] bg-gray-700"></div>
                <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto mt-4"></div>
              </div>
            ) : (
              <>
                <Image
                  src={getAssetFullUrl(profileData.image) || "/background.jpg?height=120&width=120"}
                  alt="Profile"
                  width={120}
                  height={120}
                  className="mx-auto rounded-full border-8 border-[#2c2f3f]"
                />
                <h1 className="text-2xl font-semibold mt-4">
                  <Link href="/" className="text-white hover:text-[#149ddd]">
                    {profileData.name}
                  </Link>
                </h1>
              </>
            )}
            <div className="social-links flex justify-center mt-4 space-x-2">
              {profileData.socials && profileData.socials.length > 0 ? (
                profileData.socials.map((social: Social, idx) => {
                  const Icon = SOCIAL_PLATFORMS[social.platform as SocialPlatformName] || SOCIAL_PLATFORMS.Other
                  return (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#212431] p-2 rounded-full hover:bg-[#149ddd] transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  )
                })
              ) : (
                <>
                  <a href="#" className="bg-[#212431] p-2 rounded-full hover:bg-[#149ddd] transition-colors">
                    <SOCIAL_PLATFORMS.Twitter className="h-4 w-4" />
                  </a>
                  <a href="#" className="bg-[#212431] p-2 rounded-full hover:bg-[#149ddd] transition-colors">
                    <SOCIAL_PLATFORMS.Facebook className="h-4 w-4" />
                  </a>
                  <a href="#" className="bg-[#212431] p-2 rounded-full hover:bg-[#149ddd] transition-colors">
                    <SOCIAL_PLATFORMS.Instagram className="h-4 w-4" />
                  </a>
                  <a href="#" className="bg-[#212431] p-2 rounded-full hover:bg-[#149ddd] transition-colors">
                    <SOCIAL_PLATFORMS.LinkedIn className="h-4 w-4" />
                  </a>
                </>
              )}
            </div>
          </div>

          <nav className="nav-menu mt-6 flex-1">
            <ul className="space-y-2 px-4">
              <li>
                <a
                  href="#hero"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "hero" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Home className="h-5 w-5 mr-3" />
                  <span>Home</span>
                </a>
              </li>
              <li>
                <a
                  href="#profile"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "profile" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <User className="h-5 w-5 mr-3" />
                  <span>Profile</span>
                </a>
              </li>
              <li>
                <a
                  href="#facts"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "facts" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Info className="h-5 w-5 mr-3" />
                  <span>Facts</span>
                </a>
              </li>
              <li>
                <a
                  href="#skills"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "skills" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Sparkles className="h-5 w-5 mr-3" />
                  <span>Skills</span>
                </a>
              </li>
              <li>
                <a
                  href="#experience"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "experience" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Building2 className="h-5 w-5 mr-3" />
                  <span>Experience</span>
                </a>
              </li>
              <li>
                <a
                  href="#education"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "education" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <GraduationCap className="h-5 w-5 mr-3" />
                  <span>Education</span>
                </a>
              </li>
              <li>
                <a
                  href="#certificates"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "certificates" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Award className="h-5 w-5 mr-3" />
                  <span>Certificates</span>
                </a>
              </li>
              <li>
                <a
                  href="#portfolio"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "portfolio" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Briefcase className="h-5 w-5 mr-3" />
                  <span>Portfolio</span>
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "services" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Server className="h-5 w-5 mr-3" />
                  <span>Services</span>
                </a>
              </li>
              <li>
                <a
                  href="#testimonials"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "testimonials" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  <span>Testimonials</span>
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className={`flex items-center py-2 px-4 rounded-md transition-colors ${activeSection === "contact" ? "text-white bg-[#149ddd]/20" : "text-[#a8a9b4] hover:text-white"}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Mail className="h-5 w-5 mr-3" />
                  <span>Contact</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
    </>
  )
}
