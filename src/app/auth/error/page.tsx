'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: { [key: string]: string } = {
    default: 'An error occurred during authentication',
    configuration: 'There is a problem with the server configuration',
    accessdenied: 'You do not have permission to sign in',
    verification: 'The verification link was invalid or has expired',
  }

  const message = error ? errorMessages[error] || errorMessages.default : errorMessages.default

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h2 className="text-3xl font-bold text-red-600">Authentication Error</h2>
        <p className="mt-2 text-gray-600">{message}</p>
        <Link 
          href="/auth/signin"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try Again
        </Link>
      </div>
    </div>
  )
}