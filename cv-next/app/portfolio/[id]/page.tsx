"use client"

import { useEffect, useState, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import { parseTenantSlugFromHost } from "@/lib/tenant"
import { cvApi, cvUrl } from "@/lib/api/cv"

interface PortfolioItem {
  id: string
  title: string
  category: string
  client: string
  date: string
  url?: string
  description: string
  images: string[]
}

export default function PortfolioDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [portfolioItem, setPortfolioItem] = useState<PortfolioItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const slug = parseTenantSlugFromHost(window.location.host)
        const headers: HeadersInit = {}
        if (slug) headers["X-Tenant-Slug"] = slug
        const res = await fetch(cvUrl(cvApi.portfolio(id)), { headers })
        if (res.status === 404) {
          setPortfolioItem(null)
        } else if (!res.ok) {
          throw new Error("Failed to fetch portfolio item")
        } else {
          const item = await res.json()
          setPortfolioItem(item)
        }
      } catch (error) {
        console.error("Error fetching portfolio item:", error)
        setPortfolioItem(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // Default placeholder data while loading
  const placeholderItem: PortfolioItem = {
    id: id,
    title: "Project Title",
    category: "Web Design",
    client: "Client Name",
    date: "January 2023",
    url: "https://example.com",
    description: "Loading project description...",
    images: ["/background.jpg", "/background.jpg", "/background.jpg"],
  }

  const item = loading ? placeholderItem : portfolioItem

  if (!loading && !portfolioItem) {
    notFound()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/loading.gif" alt="Loading..." className="h-12 w-12" />
      </div>
    );
  }

  if (!item) return null

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === (item.images?.length || 1) - 1 ? 0 : prev + 1))
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? (item.images?.length || 1) - 1 : prev - 1))
  }

  const images = item.images || ["/background.jpg"]

  return (
    <div className="bg-[#f5f8fd] min-h-screen">
      {/* Breadcrumbs */}
      <section className="bg-white py-4 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#173b6c]">Portfolio Details</h2>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-[#149ddd] hover:text-[#37b3ed]">
                Home
              </Link>
              <span>/</span>
              <span>Portfolio Details</span>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Details */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Image Slider */}
            <div className="lg:col-span-2">
              <div className="relative bg-white p-2 rounded-lg shadow-md">
                <div className="relative aspect-video overflow-hidden rounded-md">
                  <Image
                    src={images[currentImageIndex] || "/placeholder.svg"}
                    alt={`${item.title} - image ${currentImageIndex + 1}`}
                    fill
                    className="object-cover"
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Image Pagination Dots */}
                {images.length > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {images.map((_, index: number) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-3 w-3 rounded-full ${
                          currentImageIndex === index ? "bg-[#149ddd]" : "bg-gray-300"
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Project Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-bold text-[#173b6c] mb-4">Project Information</h3>
                <ul className="space-y-3">
                  <li className="flex">
                    <strong className="w-1/3">Category:</strong>
                    <span className="w-2/3">{item.category}</span>
                  </li>
                  <li className="flex">
                    <strong className="w-1/3">Client:</strong>
                    <span className="w-2/3">{item.client}</span>
                  </li>
                  <li className="flex">
                    <strong className="w-1/3">Project date:</strong>
                    <span className="w-2/3">{item.date}</span>
                  </li>
                  {item.url && (
                    <li className="flex">
                      <strong className="w-1/3">Project URL:</strong>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-2/3 text-[#149ddd] hover:text-[#37b3ed]"
                      >
                        {item.url}
                      </a>
                    </li>
                  )}
                </ul>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-[#173b6c] mb-4">{item.title}</h2>
                <div 
                  className="text-gray-600 prose prose-sm max-w-none" 
                  dangerouslySetInnerHTML={{ __html: item.description || '' }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/#portfolio">
              <Button variant="outline">Back to Portfolio</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
