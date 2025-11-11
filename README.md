
# Portfolio + Login + Admin (Express + SQLite)

This is a complete, responsive portfolio with:
- **Login page** to collect name, email (required) and phone (optional)
- **SQLite database** storing sign-ups
- **Admin dashboard** (password protected) to search, view, and export CSV
- Smooth animations and mobile-friendly UI

## Quick Start

1. Install Node.js (>= 18).
2. In terminal:
   ```bash
   cd portfolio-app
   npm i
   # optional: change admin password
   set ADMIN_PASSWORD=admin123   # Windows (Powershell: $env:ADMIN_PASSWORD='admin123')
   export ADMIN_PASSWORD=admin123 # macOS/Linux
   npm start
   ```
3. Open http://localhost:3000 to see the **login** page.
4. After login, you'll be redirected to the **portfolio**.
5. Visit **/admin.html**, enter the admin password to see sign-ups.

## Files

- `server.js`: Express server + SQLite setup
- `public/login.html`: Login form
- `public/portfolio.html`: Your portfolio (based on your original index.html)
- `public/admin.html` + `public/admin.js`: Admin dashboard
- `public/style.css`: Your original styles (with animations), fully responsive
- `public/app.js`: Shared theme + login + scroll animations
- `data.sqlite`: Auto-created on first run

## Notes

- Default admin password: `admin123` (change via `ADMIN_PASSWORD` env var).
- Session cookie keeps admin logged in until logout.
- The portfolio content is adapted from your provided file on 2025-11-10.
