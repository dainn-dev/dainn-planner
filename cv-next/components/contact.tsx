"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { MapPin, Mail, Phone } from "lucide-react"
import { useCvContentFromApi } from "@/components/cv-content-context"
import { cvApi, cvUrl } from "@/lib/api/cv"

const CONTACT_SECTION_INTRO =
  "Feel free to reach out to me for any project or collaboration. I am always open to discussing new opportunities and creative ideas."

export default function Contact() {
  const apiCv = useCvContentFromApi()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [status, setStatus] = useState({
    loading: false,
    error: false,
    success: false,
    message: "",
  })
  const [profile, setProfile] = useState({
    email: "info@example.com",
    phone: "+1 5589 55488 55s",
    location: "A108 Adam Street, New York, NY 535022",
  })

  useEffect(() => {
    const p = apiCv?.content?.profile as Record<string, unknown> | null | undefined
    if (p && typeof p === "object") {
      setProfile((prev) => ({
        ...prev,
        email: typeof p.email === "string" ? p.email : prev.email,
        phone: typeof p.phone === "string" ? p.phone : prev.phone,
        location: typeof p.location === "string" ? p.location : prev.location,
      }))
    }
  }, [apiCv])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Contact form submitted!", formData)
    setStatus({ loading: true, error: false, success: false, message: "" })

    try {
      const res = await fetch(cvUrl(cvApi.contact), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({
          loading: false,
          error: false,
          success: true,
          message: "Your message has been sent. Thank you!",
        });
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus({
          loading: false,
          error: true,
          success: false,
          message: "Failed to send message. Please try again.",
        });
      }
    } catch (error) {
      setStatus({
        loading: false,
        error: true,
        success: false,
        message: "Failed to send message. Please try again.",
      });
    }
  }

  return (
    <section id="contact" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Contact</h2>
          <p className="text-gray-600">{CONTACT_SECTION_INTRO}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" data-aos="fade-in">
          <div className="lg:col-span-5">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start mb-6">
                <div className="flex items-center justify-center bg-[#dff3fc] w-12 h-12 rounded-full mr-4 flex-shrink-0">
                  <MapPin className="h-6 w-6 text-[#149ddd]" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#173b6c]">Location:</h4>
                  <p className="text-sm text-gray-600">{profile.location}</p>
                </div>
              </div>

              <div className="flex items-start mb-6">
                <div className="flex items-center justify-center bg-[#dff3fc] w-12 h-12 rounded-full mr-4 flex-shrink-0">
                  <Mail className="h-6 w-6 text-[#149ddd]" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#173b6c]">Email:</h4>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start mb-6">
                <div className="flex items-center justify-center bg-[#dff3fc] w-12 h-12 rounded-full mr-4 flex-shrink-0">
                  <Phone className="h-6 w-6 text-[#149ddd]" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#173b6c]">Call:</h4>
                  <p className="text-sm text-gray-600">{profile.phone}</p>
                </div>
              </div>

              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(profile.location || 'New York, NY')}&output=embed`}
                className="w-full h-64 rounded-lg border-0"
                allowFullScreen
                loading="lazy"
                title="Google Maps"
              ></iframe>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="name" className="block text-sm text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#149ddd]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm text-gray-700 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#149ddd]"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="subject" className="block text-sm text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#149ddd]"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="message" className="block text-sm text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  id="message"
                  rows={10}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#149ddd]"
                  required
                ></textarea>
              </div>
              <div className="mb-4 text-center">
                {status.loading && <div className="text-gray-600">Loading...</div>}
                {status.error && <div className="text-red-500">{status.message}</div>}
                {status.success && <div className="text-green-500">{status.message}</div>}
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#149ddd] text-white rounded-md hover:bg-[#37b3ed] transition-colors disabled:opacity-70"
                  disabled={status.loading}
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
