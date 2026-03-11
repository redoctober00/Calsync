import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getSupabaseEvents, type SupabaseEvent } from '@/lib/api'

export function useSupabaseEvents() {
  const [events, setEvents] = useState<SupabaseEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSupabaseEvents()
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetch()
  }, [fetch])

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          setEvents((prev) => {
            const newEvent = payload.new as SupabaseEvent
            // Avoid duplicates
            if (prev.some((e) => e.id === newEvent.id)) return prev
            // Insert in sorted order
            const next = [...prev, newEvent].sort(
              (a, b) =>
                new Date(a.start_datetime).getTime() -
                new Date(b.start_datetime).getTime()
            )
            return next
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === (payload.new as SupabaseEvent).id
                ? (payload.new as SupabaseEvent)
                : e
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'events' },
        (payload) => {
          setEvents((prev) =>
            prev.filter((e) => e.id !== (payload.old as SupabaseEvent).id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { events, loading, error, refresh: fetch }
}
