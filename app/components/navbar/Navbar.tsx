'use client'
import { useRouter } from 'next/navigation'
import React from 'react'

const Navbar: React.FC = () => {
  const router = useRouter()
  return (
    <nav className="bg-blue-500">
      <div className="container mx-auto p-4 flex justify-center text-white items-center">
        <button onClick={() => router.push('/')} className="text-lg font-bold">
          My Application
        </button>
        
      </div>
    </nav>
  )
}

export default Navbar
