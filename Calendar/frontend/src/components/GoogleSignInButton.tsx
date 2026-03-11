import { getGoogleSignInUrl } from '@/lib/api'

export default function GoogleSignInButton() {
  const handleSignIn = () => {
    window.location.href = getGoogleSignInUrl()
  }

  return (
    <button
      id="google-sign-in-btn"
      onClick={handleSignIn}
      className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-xl
                 bg-white text-gray-800 font-semibold text-sm
                 hover:bg-gray-50 active:scale-[0.99]
                 transition-all duration-200 shadow-md shadow-black/30
                 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Official Google "G" mark */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        width="20"
        height="20"
        className="shrink-0"
        aria-hidden="true"
      >
        <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 2.9l6.1-6.1C34.5 3 29.5 1 24 1 14.6 1 6.7 6.7 3.2 14.8l7.1 5.5C12 14.1 17.5 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.6H24v8.7h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-17z"/>
        <path fill="#FBBC05" d="M10.3 28.3A14.5 14.5 0 0 1 9.5 24c0-1.5.3-2.9.8-4.3l-7.1-5.5A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.7-6.4z"/>
        <path fill="#34A853" d="M24 47c5.4 0 10-1.8 13.3-4.9l-7.4-5.7c-1.8 1.2-4.1 2-6.9 2-6.4 0-11.9-4.3-13.7-10.1l-7.7 6.4C6.7 41.5 14.6 47 24 47z"/>
      </svg>
      Sign in with Google
    </button>
  )
}
