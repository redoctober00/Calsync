import express from 'express';
import { google } from 'googleapis';
import { createOAuth2Client } from '../lib/oauth.js';

const router = express.Router();

/**
 * Middleware: ensures the user is authenticated before accessing calendar routes.
 */
function requireAuth(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

/**
 * Returns a Google Calendar client using the session tokens.
 */
function getCalendarClient(req) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(req.session.tokens);
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// ── GET /api/calendars ────────────────────────────────────────────────────────
// Returns the user's full Google Calendar list (all calendars they're subscribed to)
router.get('/calendars', requireAuth, async (req, res) => {
  try {
    const calendar = getCalendarClient(req);
    const response = await calendar.calendarList.list({
      minAccessRole: 'reader',
    });

    const calendars = (response.data.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description || '',
      backgroundColor: cal.backgroundColor || '#4285f4',
      foregroundColor: cal.foregroundColor || '#ffffff',
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    }));

    res.json({ calendars });
  } catch (err) {
    console.error('Calendar list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch calendars', details: err.message });
  }
});

// ── POST /api/events ──────────────────────────────────────────────────────────
// Inserts a new event into the user's primary Google Calendar
router.post('/events', requireAuth, async (req, res) => {
  const { title, description, location, startDateTime, endDateTime } = req.body;

  if (!title || !startDateTime || !endDateTime) {
    return res.status(400).json({ error: 'title, startDateTime, and endDateTime are required.' });
  }

  const event = {
    summary: title,
    description: description || '',
    location: location || '',
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone: 'Asia/Manila',
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
      timeZone: 'Asia/Manila',
    },
  };

  try {
    const calendar = getCalendarClient(req);
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: response.data.id,
        title: response.data.summary,
        htmlLink: response.data.htmlLink,
        start: response.data.start,
        end: response.data.end,
      },
    });
  } catch (err) {
    console.error('Calendar insert error:', err.message);
    res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
});

// ── GET /api/events ───────────────────────────────────────────────────────────
// Fetches events for the given time range from one or more calendars.
// Query params: calendarIds (comma-sep), timeMin (ISO), timeMax (ISO)
router.get('/events', requireAuth, async (req, res) => {
  try {
    const calendar = getCalendarClient(req);

    const { calendarId, calendarIds, timeMin, timeMax } = req.query;

    let ids = [];
    if (calendarIds) {
      ids = String(calendarIds).split(',').filter(Boolean);
    } else if (calendarId) {
      ids = [String(calendarId)];
    } else {
      ids = ['primary'];
    }

    // Default time range: start of current month → end of month after next (covers visible + adjacent months)
    const now = new Date();
    const defaultMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const defaultMax = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59).toISOString();

    const rangeMin = timeMin ? String(timeMin) : defaultMin;
    const rangeMax = timeMax ? String(timeMax) : defaultMax;

    // Fetch from all calendars in parallel
    const allResults = await Promise.all(
      ids.map((id) =>
        calendar.events.list({
          calendarId: id,
          timeMin: rangeMin,
          timeMax: rangeMax,
          maxResults: 250,
          singleEvents: true,
          orderBy: 'startTime',
        }).then((r) => ({
          calendarId: id,
          items: r.data.items || [],
        })).catch(() => ({ calendarId: id, items: [] }))
      )
    );

    // Merge + sort
    const events = allResults
      .flatMap(({ calendarId: cid, items }) =>
        items.map((e) => ({
          id: e.id,
          title: e.summary || '(No title)',
          description: e.description || '',
          location: e.location || '',
          start: e.start,
          end: e.end,
          htmlLink: e.htmlLink,
          calendarId: cid,
        }))
      )
      .sort((a, b) => {
        const at = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const bt = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return at - bt;
      });

    res.json({ events });
  } catch (err) {
    console.error('Calendar list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch events', details: err.message });
  }
});


export default router;
