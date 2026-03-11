# CalSync: Enterprise Calendar Optimization & Synchronization Suite

## Executive Summary
**CalSync** is a unified temporal management platform designed to synchronize disparate data streams from Google Calendar and internal database systems into a single, high-fidelity interface. The system prioritizes data integrity, real-time responsiveness, and an elite user experience to facilitate professional productivity and schedule orchestration.

---

## Technical Architecture Overview

### 1. Persistent Data Layer (Supabase)
The system leverages a **PostgreSQL** foundation managed via Supabase. 
*   **Archival Integrity**: Implements an automated "Soft-Delete" archival pattern through SQL-level stored procedures (`archive_past_events`), ensuring the primary `events` table remains optimized for performance while maintaining comprehensive audit logs in `deleted_events`.
*   **Security Protocol**: Utilizes Postgres Row Level Security (RLS) and JWT-based authentication to ensure strict data multi-tenancy.

### 2. Service Integration Layer (Node.js & Express)
A robust middleware layer acts as the orchestrator between the client and the **Google Calendar API (v3)**.
*   **OAuth2 Flow**: Implements secure authorization code grant flows to manage user permissions and token refreshing.
*   **Data Transformation**: Normalizes diverse API responses into a unified TypeScript interface, reducing frontend complexity and ensuring consistent data rendering.

### 3. High-Fidelity Client Interface (React & TypeScript)
The frontend is engineered for speed and visual excellence.
*   **State Orchestration**: Employs sophisticated React hooks and polling mechanisms (10s intervals) to provide a "Real-Time" feel without the overhead of persistent WebSockets where unnecessary.
*   **Interactivity Suite**: Adheres to the "UI-UX Pro Max" design philosophy, featuring glassmorphic components, tactile feedback through CSS-transform micro-animations, and a fully accessible ARIA-compliant modal architecture.

---

## Key Strategic Capabilities

| Capability | Description |
| :--- | :--- |
| **Hybrid Sync** | Simultaneous management of Google Calendar remote events and Supabase-backed local projects. |
| **Intelligent Archiving** | Proactive maintenance system that migrates expired events to historical storage on every session login. |
| **Unified Detail View** | A centralized modal system that provides consistent high-fidelity viewing and editing, regardless of the event source. |
| **Responsive Design** | A mobile-first, desktop-optimized layout that maintains professional aesthetics across all device form factors. |

---

## Security & Compliance
*   **Identity Management**: Leverages OpenID Connect (OIDC) via Google Identity Services for secure, password-less authentication.
*   **Data Stewardship**: All user data is partitioned at the database level, with no cross-user visibility of calendar IDs or personal event content.
*   **Backend Hardening**: Utilizes `helmet` for security headers and `express-rate-limit` for DDoS mitigation.

---

## Setup & Installation

### Backend
1. `cd Calendar/backend`
2. `npm install`
3. Configure `.env` with Supabase and Google OAuth credentials.
4. `npm start`

### Frontend
1. `cd Calendar/frontend`
2. `npm install`
3. `npm run dev`

---

## Future Roadmap
*   **Advanced Analytics**: Integration of time-spent auditing across different project categories.
*   **Collaborative Sync**: Multi-user shared calendar spaces with real-time editing conflict resolution.
*   **Predictive Scheduling**: AI-driven suggestions for archival and event categorization based on historical user behavior.
