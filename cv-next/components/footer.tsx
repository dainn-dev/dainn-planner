export default function Footer() {
  return (
    <footer id="footer" className="py-8 bg-[#0a0e12] border-t border-[#2a323c] text-center">
      <div className="container mx-auto px-4">
        <div className="text-gray-300">
          &copy; Copyright{" "}
          <strong>
            <span className="text-[#149ddd]">Dainn</span>
          </strong>
        </div>
        <div className="text-gray-500 text-sm mt-1">Designed with Next.js and Tailwind CSS</div>
      </div>
    </footer>
  )
}
