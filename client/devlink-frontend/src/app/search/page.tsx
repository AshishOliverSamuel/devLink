"use client"
import { FilterIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { FiArrowLeft, FiFilter } from "react-icons/fi"


const page = () => {

    const router=useRouter()
  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm  flex items-center gap-6"

          >
            <FiArrowLeft className="hover:text-blue-400" size={24} /> 
            <p className="text-xl">Search</p>
        </button>

    <button className="text-lg text-blue-400 flex items-center gap-2">
        <FiFilter size={20} />

    </button>
        </div>
        

        </header>
        </main>
  )
}

export default page

