import express from 'express';
import { google } from 'googleapis';
import { createOAuth2Client } from '../lib/oauth.js';

const router = express.Router();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// ── GET /auth/google ──────────────────────────────────────────────────────────
// Redirects the browser to Google's OAuth consent screen
router.get('/auth/google', (req, res) => {
  const oauth2Client = createOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.redirect(url);
});

// ── GET /auth/callback ────────────────────────────────────────────────────────
// Google redirects here after the user grants/denies permission
router.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`http://localhost:5173?error=${encodeURIComponent(error)}`);
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch basic profile info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    // Store tokens + user info in session
    req.session.tokens = tokens;
    req.session.user = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
    };

    res.redirect('http://localhost:5173');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`http://localhost:5173?error=${encodeURIComponent('Authentication failed')}`);
  }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
// Returns the currently-logged-in user from the session
router.get('/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.session.user });
});

// ── GET /auth/logout ──────────────────────────────────────────────────────────
// Destroys the session
router.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;
