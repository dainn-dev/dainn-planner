"use client"

import Image from "next/image"
import { ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"
import { useCvContentFromApi } from "@/components/cv-content-context"

export default function AboutContent() {
  const apiCv = useCvContentFromApi()
  const [profileData, setProfileData] = useState({
    name: "Your Name",
    title: "UI/UX Designer & Web Developer",
    about: "Magnam dolores commodi suscipit. Necessitatibus eius consequatur ex aliquid fuga eum quidem.",
    aboutTop: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    aboutBottom: "Officiis eligendi itaque labore et dolorum mollitia officiis optio vero. Quisquam sunt adipisci omnis et ut. Nulla accusantium dolor incidunt officia tempore. Et eius omnis. Cupiditate ut dicta maxime officiis quidem quia. Sed et consectetur qui quia repellendus itaque neque. Aliquid amet quidem ut quaerat cupiditate. Ab et eum qui repellendus omnis culpa magni laudantium dolores.",
    email: "email@example.com",
    phone: "+123 456 7890",
    location: "New York, USA",
    birthday: "1 May 1995",
    website: "www.example.com",
    degree: "Master",
    freelance: "Available",
    image: "",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = apiCv?.content?.profile as Record<string, unknown> | null | undefined
    if (p && typeof p === "object") {
      setProfileData((prev) => ({ ...prev, ...p }))
    }
    setLoading(false)
  }, [apiCv])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-gray-200 rounded-lg h-[600px]"></div>
          </div>
          <div className="lg:col-span-8 pt-4 lg:pt-0">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
                ))}
              </div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
                ))}
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full mt-6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <p className="text-gray-600 mb-8">{profileData.about}</p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4" data-aos="fade-right">
          <Image
            src={profileData.image || "/background.jpg?height=600&width=600"}
            alt="Profile"
            width={600}
            height={600}
            className="w-full rounded-lg"
          />
        </div>
        <div className="lg:col-span-8 pt-4 lg:pt-0" data-aos="fade-left">
          <h3 className="text-2xl font-bold text-[#173b6c] mb-4">{profileData.title}</h3>
          <p className="italic text-gray-600 mb-4">
            {profileData.aboutTop}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
            <div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 text-[#149ddd] mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Birthday:</span> {profileData.birthday}
                  </div>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 text-[#149ddd] mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Website:</span> {profileData.website}
                  </div>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 text-[#149ddd] mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Phone:</span> {profileData.phone}
                  </div>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 text-[#149ddd] mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium">City:</span> {profileData.location}
                  </div>
                </li>
              </ul>
            </div>
            <div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 text-[#149ddd] mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Age:</span> 30
                  </div>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 text-[#149ddd] mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Degree:</span> {profileData.degree}
                  </div>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 text-[#149ddd] mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Email:</span> {profileData.email}
                  </div>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 text-[#149ddd] mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Freelance:</span> {profileData.freelance}
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-gray-600">
            {profileData.aboutBottom}
          </p>
        </div>
      </div>
    </>
  )
}
