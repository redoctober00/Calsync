import { type User } from '@/lib/api'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import EventForm from '@/components/EventForm'
import UpcomingEvents from '@/components/UpcomingEvents'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Calendar } from 'lucide-react'

interface HomeProps {
  user: User | null
  onEventSuccess: (event: { title: string; htmlLink: string }) => void
}

export default function Home({ user, onEventSuccess }: HomeProps) {
  return (
    <div className="min-h-screen px-4 py-8">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary shadow-md shadow-primary/30">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              CalSync
            </h1>
            <p className="text-xs text-muted-foreground">Google Calendar Event Creator</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto">
        {!user ? (
          /* ── Sign-in screen ── */
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              <CardHeader className="text-center pt-10">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 w-fit">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Welcome to CalSync</CardTitle>
                <CardDescription className="mt-2 text-base">
                  Sign in with Google to create and manage your calendar events
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-10 px-8">
                <GoogleSignInButton />
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  CalSync will request access to your Google Calendar to create events on your behalf.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ── Authenticated layout ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
            {/* Left: Event Form */}
            <div>
              <EventForm onSuccess={onEventSuccess} />
            </div>

            {/* Right: Sidebar */}
            <div className="space-y-4">
              {/* User info card */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/80 backdrop-blur-sm shadow-md border-0">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-10 w-10 rounded-full ring-2 ring-primary/20"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              {/* Upcoming events */}
              <UpcomingEvents />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
