"use client"

import { sanitizeCvHtml } from "@/lib/sanitize-html"

export default function ResumeCertificates({
  certificates,
  ready,
}: {
  certificates: any[]
  ready: boolean
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[#4ab8e6] mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
        Certificates
      </h3>
      {!ready ? (
        <div className="animate-pulse">
          <div className="h-5 bg-[#1c232b] rounded w-1/3 mb-2" />
          <div className="h-4 bg-[#1c232b] rounded w-1/4 mb-2" />
          <div className="h-4 bg-[#1c232b] rounded w-1/2 mb-2" />
          <div className="h-4 bg-[#1c232b] rounded w-full" />
        </div>
      ) : certificates.length === 0 ? (
        <p className="text-gray-500 italic text-sm">No certificates added yet.</p>
      ) : (
        certificates.map((cert, index) => (
          <div key={cert.id || index} className="mb-6">
            <h4 className="text-base font-bold text-gray-100">{cert.title}</h4>
            <h5 className="text-sm text-[#149ddd] font-semibold mb-1">{cert.issuer}</h5>
            {cert.date ? <p className="italic text-sm text-gray-500 mb-1">{cert.date}</p> : null}
            <div
              className="text-gray-300 prose prose-sm prose-invert max-w-none [&_table]:text-sm [&_table]:my-0 [&_tr]:!border-0 [&_th]:!p-2 [&_td]:!p-2 [&_td_p]:!my-0 [&_th_p]:!my-0"
              dangerouslySetInnerHTML={{ __html: sanitizeCvHtml(cert.description) }}
            />
          </div>
        ))
      )}
    </div>
  )
}
