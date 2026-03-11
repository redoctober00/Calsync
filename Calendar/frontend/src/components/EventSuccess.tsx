import { CheckCircle2, ExternalLink, Plus, Calendar } from 'lucide-react'

interface EventSuccessProps {
  eventTitle: string
  eventLink: string
  onCreateAnother: () => void
}

export default function EventSuccess({ eventTitle, eventLink, onCreateAnother }: EventSuccessProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]/80
                        backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Amber top glow line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

          <div className="px-8 pt-10 pb-4 text-center">
            {/* Success icon */}
            <div className="relative mx-auto mb-5 w-fit">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl animate-pulse" />
              <div className="relative p-5 rounded-full bg-amber-400/10 border border-amber-400/25">
                <CheckCircle2 className="h-11 w-11 text-amber-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Event Added!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your event has been successfully added to Google Calendar
            </p>
          </div>

          <div className="px-8 pb-10 pt-4 space-y-5">
            {/* Event name chip */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl
                            bg-amber-400/5 border border-amber-400/15">
              <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-foreground text-sm truncate min-w-0">{eventTitle}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <a
                id="view-on-calendar-btn"
                href={eventLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold
                           border border-white/[0.1] text-foreground
                           hover:bg-white/[0.05] hover:border-white/[0.15]
                           transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink size={15} />
                View on Google Calendar
              </a>
              <button
                id="create-another-btn"
                onClick={onCreateAnother}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold
                           bg-amber-400 text-amber-950
                           hover:bg-amber-300 active:scale-[0.99]
                           transition-all duration-200 shadow-lg shadow-amber-400/20
                           focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Plus size={17} />
                Create Another Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
