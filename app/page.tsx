"use client"

import OpenAPIUploader from "@/components/openapi-uploader"
import { TestEditor } from "@/components/test-editor"
import { PasswordAuth } from "@/components/password-auth"
import { useStore, useAuthStore } from "@/lib/store"

export default function Home() {
  const { readyToEdit } = useStore()
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <PasswordAuth />
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      {!readyToEdit ? (
        <div className="h-full">
          <OpenAPIUploader />
        </div>
      ) : (
        <div className="h-full">
          <TestEditor />
        </div>
      )}
    </div>
  )
}
