import express from 'express';
import { google } from 'googleapis';
import { supabase } from '../lib/supabase.js';
import { createOAuth2Client } from '../lib/oauth.js';

const router = express.Router();

// Local calendar type → Google Calendar color (colorId)
// https://developers.google.com/calendar/api/v3/reference/colors/get
const CALENDAR_TYPE_COLOR_ID = {
  Birthdays: '11',  // Tomato
  Projects:  '9',   // Blueberry
  Events:    '2',   // Sage
};

// Local calendar type → Google Calendar background hex (used when creating the calendar)
const CALENDAR_TYPE_BG = {
  Birthdays: '#ec4899',
  Projects:  '#3b82f6',
  Events:    '#10b981',
};

function getCalendarClient(req) {
  if (!req.session?.tokens) return null;
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(req.session.tokens);
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Finds a Google Calendar whose summary matches `calendarType` (case-insensitive).
 * If none exists, creates one and returns its ID.
 * Returns null if not authenticated.
 */
async function findOrCreateGoogleCalendar(calClient, calendarType) {
  try {
    const listRes = await calClient.calendarList.list({ minAccessRole: 'writer' });
    const match = (listRes.data.items || []).find(
      (c) => c.summary?.toLowerCase() === calendarType.toLowerCase()
    );
    if (match) return match.id;

    // Create a new Google Calendar for this type
    const createRes = await calClient.calendars.insert({
      resource: {
        summary: calendarType,
        description: `${calendarType} calendar — managed by CalSync`,
      },
    });

    const newCalId = createRes.data.id;

    // Set its color in the user's calendar list
    await calClient.calendarList.patch({
      calendarId: newCalId,
      resource: { backgroundColor: CALENDAR_TYPE_BG[calendarType] || '#4285f4' },
    }).catch(() => {}); // non-fatal

    return newCalId;
  } catch (err) {
    console.warn('findOrCreateGoogleCalendar failed:', err.message);
    return null;
  }
}

/**
 * Creates or updates an event in the specified Google Calendar.
 * Returns the Google event ID, or null on failure.
 */
async function upsertGoogleEvent(calClient, { title, description, start_datetime, end_datetime, calendar_type, googleEventId, googleCalendarId }) {
  const colorId = CALENDAR_TYPE_COLOR_ID[calendar_type] || undefined;
  const resource = {
    summary: title,
    description: description || '',
    colorId,
    start: { dateTime: new Date(start_datetime).toISOString(), timeZone: 'Asia/Manila' },
    end:   { dateTime: new Date(end_datetime).toISOString(),   timeZone: 'Asia/Manila' },
  };

  try {
    if (googleEventId && googleCalendarId) {
      const res = await calClient.events.update({
        calendarId: googleCalendarId,
        eventId: googleEventId,
        resource,
      });
      return res.data.id;
    } else {
      const calId = googleCalendarId || 'primary';
      const res = await calClient.events.insert({ calendarId: calId, resource });
      return res.data.id;
    }
  } catch (err) {
    console.warn('Google Calendar event upsert failed (non-fatal):', err.message);
    return null;
  }
}

async function deleteGoogleEvent(calClient, googleEventId, googleCalendarId) {
  if (!googleEventId) return;
  try {
    await calClient.events.delete({
      calendarId: googleCalendarId || 'primary',
      eventId: googleEventId,
    });
  } catch (err) {
    console.warn('Google Calendar delete failed (non-fatal):', err.message);
  }
}

// ── GET /api/supabase/events ──────────────────────────────────────────────────
router.get('/supabase/events', async (_req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_datetime', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ events: data });
});

// ── POST /api/supabase/events ──────────────────────────────────────────────────
// Creates in Supabase, then finds/creates the matching Google Calendar and inserts there
router.post('/supabase/events', async (req, res) => {
  const { title, description, start_datetime, end_datetime, calendar_type, color } = req.body;
  if (!title || !start_datetime || !end_datetime || !calendar_type) {
    return res.status(400).json({ error: 'title, start_datetime, end_datetime, and calendar_type are required.' });
  }

  const { data, error } = await supabase
    .from('events')
    .insert([{ title, description: description || '', start_datetime, end_datetime, calendar_type, color: color || '#f59e0b' }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Mirror to the matching Google Calendar
  const calClient = getCalendarClient(req);
  if (calClient) {
    const googleCalendarId = await findOrCreateGoogleCalendar(calClient, calendar_type);
    const googleEventId = await upsertGoogleEvent(calClient, {
      title, description, start_datetime, end_datetime, calendar_type,
      googleEventId: null,
      googleCalendarId,
    });

    if (googleEventId || googleCalendarId) {
      const patch = {};
      if (googleEventId) patch.google_event_id = googleEventId;
      if (googleCalendarId) patch.google_calendar_id = googleCalendarId;
      await supabase.from('events').update(patch).eq('id', data.id);
      Object.assign(data, patch);
    }
  }

  res.status(201).json({ event: data });
});

// ── PUT /api/supabase/events/:id ──────────────────────────────────────────────
router.put('/supabase/events/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, start_datetime, end_datetime, calendar_type, color } = req.body;

  const { data: existing } = await supabase
    .from('events')
    .select('google_event_id, google_calendar_id')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('events')
    .update({ title, description, start_datetime, end_datetime, calendar_type, color })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // If calendar_type changed, we may need to move it to a different Google Calendar
  const calClient = getCalendarClient(req);
  if (calClient) {
    let googleCalendarId = existing?.google_calendar_id;

    // If no calendar ID yet, or type changed, find/create the correct one
    if (!googleCalendarId) {
      googleCalendarId = await findOrCreateGoogleCalendar(calClient, calendar_type);
    }

    const googleEventId = await upsertGoogleEvent(calClient, {
      title, description, start_datetime, end_datetime, calendar_type,
      googleEventId: existing?.google_event_id || null,
      googleCalendarId,
    });

    const patch = {};
    if (googleCalendarId) patch.google_calendar_id = googleCalendarId;
    if (googleEventId && !existing?.google_event_id) patch.google_event_id = googleEventId;
    if (Object.keys(patch).length) {
      await supabase.from('events').update(patch).eq('id', id);
      Object.assign(data, patch);
    }
  }

  res.json({ event: data });
});

// ── POST /api/supabase/events/archive-past ────────────────────────────────────
// Archives all events whose end_datetime is in the past
router.post('/supabase/events/archive-past', async (_req, res) => {
  const { data, error } = await supabase.rpc('archive_past_events');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Past events archived successfully', count: data });
});

// ── DELETE /api/supabase/events/:id ──────────────────────────────────────────
// Moves an event to the deleted_events table instead of hard deletion
router.delete('/supabase/events/:id', async (req, res) => {
  const { id } = req.params;

  const { data: existing } = await supabase
    .from('events')
    .select('google_event_id, google_calendar_id')
    .eq('id', id)
    .single();

  // Call the archival function in Supabase
  const { error } = await supabase.rpc('archive_event', { event_id: id });
  if (error) return res.status(500).json({ error: error.message });

  // Still remove from Google Calendar if mirrored
  const calClient = getCalendarClient(req);
  if (calClient && existing?.google_event_id) {
    await deleteGoogleEvent(calClient, existing.google_event_id, existing.google_calendar_id);
  }

  res.json({ message: 'Event moved to archive successfully' });
});

export default router;
