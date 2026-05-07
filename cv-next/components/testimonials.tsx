"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Quote } from "lucide-react"
import { useCvContentFromApi } from "@/components/cv-content-context"
import { getAssetFullUrl } from "@/lib/api/cv"

interface Testimonial {
  name: string
  position: string
  text: string
  imageUrl: string
}

interface TestimonialsData {
  intro: {
    title: string
    description: string
  }
  testimonials: Testimonial[]
}

const TESTIMONIALS_PER_PAGE = 3

export default function Testimonials() {
  const apiCv = useCvContentFromApi()
  const [data, setData] = useState<TestimonialsData>({
    intro: {
      title: "Testimonials",
      description: "Magnam dolores commodi suscipit. Necessitatibus eius consequatur ex aliquid fuga eum quidem. Sit sint consectetur velit. Quisquam quos quisquam cupiditate. Et nemo qui impedit suscipit alias ea. Quia fugiat sit in iste officiis commodi quidem hic quas.",
    },
    testimonials: [],
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const raw = apiCv?.content?.testimonials as TestimonialsData | null | undefined
    if (raw && typeof raw === "object" && raw.intro) {
      setData(raw)
    }
    setLoading(false)
  }, [apiCv])

  useEffect(() => {
    if (data.testimonials.length > TESTIMONIALS_PER_PAGE) {
      const interval = setInterval(() => {
        setPage((prev) => (prev + 1) % Math.ceil(data.testimonials.length / TESTIMONIALS_PER_PAGE))
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [data.testimonials.length])

  if (loading) {
    return (
      <section id="testimonials" className="py-8 bg-[#0f1418]">
        <div className="container mx-auto px-4">
          <div className="section-title mb-12">
            <div className="h-8 bg-[#1c232b] rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-[#1c232b] rounded w-3/4"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(TESTIMONIALS_PER_PAGE)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="bg-[#151b22] border border-[#2a323c] p-8 rounded-lg shadow-sm animate-pulse w-full max-w-xl mb-8 relative">
                  <div className="h-6 bg-[#1c232b] rounded w-1/2 mx-auto mb-4"></div>
                  <div className="h-4 bg-[#1c232b] rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-[#1c232b] rounded w-2/3 mx-auto mb-6"></div>
                </div>
                <div className="h-24 w-24 bg-[#1c232b] rounded-full mb-2"></div>
                <div className="h-4 bg-[#1c232b] rounded w-24 mb-1"></div>
                <div className="h-3 bg-[#1c232b] rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const totalPages = Math.ceil(data.testimonials.length / TESTIMONIALS_PER_PAGE)
  const startIdx = page * TESTIMONIALS_PER_PAGE
  const testimonialsToShow = data.testimonials.slice(startIdx, startIdx + TESTIMONIALS_PER_PAGE)

  return (
    <section id="testimonials" className="py-8 bg-[#0f1418]">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12 text-center">
          <h2>Testimonials</h2>
          <p className="text-gray-400">{data.intro.description}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {testimonialsToShow.map((testimonial, idx) => (
            <div key={startIdx + idx} className="flex flex-col items-center">
              <div className="relative bg-[#151b22] border border-[#2a323c] p-4 rounded-lg shadow-md w-full text-center mb-6 overflow-hidden h-52">
                <Quote className="h-5 w-5 text-[#149ddd] mx-auto mb-2" />
                <p className="text-sm text-gray-300 mb-4">{testimonial.text}</p>
                <div
                  className="absolute left-1/2 -bottom-5 -translate-x-1/2 w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-t-12 border-t-[#151b22]"
                  style={{ borderLeftWidth: 24, borderRightWidth: 24, borderTopWidth: 20 }}
                />
              </div>
              {testimonial.imageUrl ? (
                <Image
                  src={getAssetFullUrl(testimonial.imageUrl)}
                  alt={testimonial.name}
                  width={56}
                  height={56}
                  className="rounded-full border-2 border-[#2a323c] shadow-md object-cover mb-2 w-14 h-14"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border-4 border-[#2a323c] shadow-md mb-2 bg-[#1c232b] flex items-center justify-center text-gray-400 text-lg font-bold">
                  {testimonial.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="text-base font-bold text-[#4ab8e6] mt-2">{testimonial.name}</h3>
              <h4 className="text-gray-500 text-sm mt-1">{testimonial.position}</h4>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center mt-10 space-x-2">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                className={`w-3 h-3 rounded-full ${page === idx ? 'bg-[#149ddd]' : 'bg-[#2a323c]'} focus:outline-none`}
                onClick={() => setPage(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
