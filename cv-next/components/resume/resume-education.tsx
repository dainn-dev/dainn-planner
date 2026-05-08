"use client"

import { sanitizeCvHtml } from "@/lib/sanitize-html"

export default function ResumeEducation({ education }: { education: any[] }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[#4ab8e6] mb-6 flex items-center gap-2 border-l-4 border-[#149ddd] pl-3">
        Education
      </h3>
      {education.length === 0 ? (
        <p className="text-gray-500 italic text-sm">No education added yet.</p>
      ) : (
        education.map((edu, index) => (
          <div key={edu.id || index} className="mb-6">
            <h4 className="text-base font-bold text-gray-100">{edu.school}</h4>
            <h5 className="text-sm text-[#149ddd] font-semibold mb-1">{edu.degree}</h5>
            {edu.location ? <p className="italic text-sm text-gray-500 mb-1">{edu.location}</p> : null}
            {edu.description ? (
              <div
                className="text-gray-300 text-sm prose prose-sm prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeCvHtml(edu.description) }}
              />
            ) : null}
          </div>
        ))
      )}
    </div>
  )
}
