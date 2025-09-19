"use client"

import { LogoutButton } from "@/components/logout-button"

export default function LogoutPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-blue-700">Sign Out</h1>
        <p className="text-gray-600">Click below to log out of your account.</p>
        <LogoutButton />
      </div>
    </main>
  )
}
