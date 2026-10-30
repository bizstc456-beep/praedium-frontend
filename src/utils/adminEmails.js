// UI-only hint used to decide what the sidebar/routing shows for the admin
// account (which nav items appear, whether "/" lands on the admin
// dashboard). This is NOT a security boundary -- every admin-only backend
// route (e.g. /api/admin/stats) re-checks the caller's email server-side
// against its own allowlist, independent of this file. Keep this list in
// sync with that one if it ever changes.
export const ADMIN_EMAILS = ['bizstc456@gmail.com'];
