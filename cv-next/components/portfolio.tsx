"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Eye, X } from "lucide-react"
import { useCvContentFromApi } from "@/components/cv-content-context"
import { getAssetFullUrl } from "@/lib/api/cv"

interface PortfolioItem {
  id: string
  category: string
  imageUrl: string
  title: string
  detailsUrl?: string
  client?: string
  date?: string
  url?: string
  description?: string
  images?: string[]
}

interface PortfolioData {
  intro: {
    title: string
    description: string
  }
  items: PortfolioItem[]
}

export default function Portfolio() {
  const apiCv = useCvContentFromApi()
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    intro: {
      title: "Portfolio",
      description:
        "Magnam dolores commodi suscipit. Necessitatibus eius consequatur ex aliquid fuga eum quidem. Sit sint consectetur velit. Quisquam quos quisquam cupiditate. Et nemo qui impedit suscipit alias ea. Quia fugiat sit in iste officiis commodi quidem hic quas.",
    },
    items: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null)

  useEffect(() => {
    const raw = apiCv?.content?.portfolio as PortfolioData | null | undefined
    if (raw && typeof raw === "object" && raw.intro) {
      setPortfolioData(raw)
    }
    setLoading(false)
  }, [apiCv])

  // Default items to show while loading
  const defaultItems: PortfolioItem[] = [
    { id: "1", category: "app", imageUrl: "/background.jpg?height=400&width=600", title: "App 1" },
    { id: "2", category: "web", imageUrl: "/background.jpg?height=400&width=600", title: "Web 3" },
    { id: "3", category: "app", imageUrl: "/background.jpg?height=400&width=600", title: "App 2" },
  ]

  const items = loading ? defaultItems : portfolioData.items

  const intro = portfolioData.intro

  const handleItemClick = (item: PortfolioItem) => {
    setSelectedItem(item)
  }

  const handleCloseModal = () => {
    setSelectedItem(null)
  }

  return (
    <section id="portfolio" className="py-8 bg-[#0f1418]">
      <div className="container mx-auto px-4">
        <div className="section-title mb-12">
          <h2>Portfolio</h2>
          <p className="text-gray-400">{intro.description}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-aos="fade-up" data-aos-delay="100">
          {items.map((item, idx) => (
            <div key={item.id ?? idx} className="portfolio-item cursor-pointer group" onClick={() => handleItemClick(item)}>
              <div className="portfolio-wrap relative">
                <Image
                  src={getAssetFullUrl(item.imageUrl) || "/background.jpg"}
                  alt={item.title}
                  width={300}
                  height={200}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-1 text-center text-sm font-semibold text-[#4ab8e6]">{item.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a1f2e] shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Cover Image */}
            <div className="relative w-full h-64 md:h-80 bg-gray-900">
              <Image
                src={getAssetFullUrl(selectedItem.imageUrl) || "/background.jpg"}
                alt={selectedItem.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Content */}
            <div className="p-6 md:p-8">
              {/* Title */}
              <h2 className="text-3xl font-bold text-white mb-4">{selectedItem.title}</h2>

              {/* Meta info */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                {selectedItem.category && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Category:</span>
                    <span className="px-3 py-1 rounded-full bg-[#149ddd]/20 text-[#149ddd] font-medium">
                      {selectedItem.category}
                    </span>
                  </div>
                )}
                {selectedItem.client && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Client:</span>
                    <span className="text-white font-medium">{selectedItem.client}</span>
                  </div>
                )}
                {selectedItem.date && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Date:</span>
                    <span className="text-white font-medium">{selectedItem.date}</span>
                  </div>
                )}
              </div>

              {/* Project URL */}
              {selectedItem.url && (
                <div className="mb-6">
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#149ddd] hover:text-[#1a8fc7] transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Visit Project</span>
                  </a>
                </div>
              )}

              {/* Description */}
              {selectedItem.description && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-3">Description</h3>
                  <div
                    className="text-gray-300 leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedItem.description }}
                  />
                </div>
              )}

              {/* Additional Images */}
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Gallery</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedItem.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
                        <Image
                          src={getAssetFullUrl(img) || "/background.jpg"}
                          alt={`${selectedItem.title} - Image ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
