import { useState } from 'react'
import { createEvent, type CreateEventPayload } from '@/lib/api'
import { CalendarPlus, Loader2, MapPin, AlignLeft, Clock, Plus } from 'lucide-react'

interface EventFormProps {
  onSuccess: (event: { title: string; htmlLink: string }) => void
}

export default function EventForm({ onSuccess }: EventFormProps) {
  const [form, setForm] = useState<CreateEventPayload>({
    title: '',
    description: '',
    location: '',
    startDateTime: '',
    endDateTime: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.startDateTime || !form.endDateTime) {
      setError('Please fill in the event title, start, and end date/time.')
      return
    }
    if (new Date(form.endDateTime) <= new Date(form.startDateTime)) {
      setError('End date/time must be after start date/time.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await createEvent(form)
      onSuccess({ title: result.event.title, htmlLink: result.event.htmlLink })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `
    w-full px-3.5 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50
    bg-[hsl(222,47%,8%)] border border-white/[0.08]
    hover:border-white/[0.14] transition-colors duration-200
    focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30
    disabled:opacity-40 disabled:cursor-not-allowed
  `

  const labelClass = "flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]/80
                    backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
      {/* Amber top line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

      <div className="p-6">
        {/* Card header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-amber-400/15 blur-md" />
            <div className="relative p-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
              <CalendarPlus className="h-5 w-5 text-amber-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              New Event
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add to your Google Calendar</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Title */}
          <div>
            <label htmlFor="title" className={labelClass}>
              Event Title <span className="text-amber-400 normal-case tracking-normal">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Team Standup Meeting…"
              value={form.title}
              onChange={handleChange}
              className={inputClass}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>
              <AlignLeft size={12} /> Description
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Optional event description…"
              value={form.description}
              onChange={handleChange}
              rows={3}
              disabled={loading}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className={labelClass}>
              <MapPin size={12} /> Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="Conference Room A or Online…"
              value={form.location}
              onChange={handleChange}
              className={inputClass}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {/* Date/Time row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDateTime" className={labelClass}>
                <Clock size={12} /> Start <span className="text-amber-400 normal-case tracking-normal">*</span>
              </label>
              <input
                id="startDateTime"
                name="startDateTime"
                type="datetime-local"
                value={form.startDateTime}
                onChange={handleChange}
                className={inputClass}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="endDateTime" className={labelClass}>
                <Clock size={12} /> End <span className="text-amber-400 normal-case tracking-normal">*</span>
              </label>
              <input
                id="endDateTime"
                name="endDateTime"
                type="datetime-local"
                value={form.endDateTime}
                onChange={handleChange}
                className={inputClass}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="add-to-calendar-btn"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm
                       bg-amber-400 text-amber-950
                       hover:bg-amber-300 active:scale-[0.99]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                       transition-all duration-200 shadow-lg shadow-amber-400/20
                       focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding to Calendar…
              </>
            ) : (
              <>
                <Plus size={17} />
                Add to Calendar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
