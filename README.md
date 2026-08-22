# Mazi O Matthew Platform

Starter social platform using GitHub Pages + Supabase.

## Setup
1. Put `index.html`, `style.css`, and `app.js` in the repository root.
2. In `app.js`, replace `PASTE_YOUR_PUBLISHABLE_KEY_HERE` with the Supabase Publishable key.
3. Never put a Supabase secret/service-role key in the browser.
4. The Supabase project should contain the `profiles`, `posts`, `comments`, `likes`, `follows`, and `notifications` tables created by the SQL setup.
5. Configure Storage policies for the `media` bucket before allowing production uploads.
6. In Supabase Auth settings, configure the Site URL and redirect URLs to the GitHub Pages URL.

## Important
This is a functional starter, not a finished production-scale clone of TikTok, YouTube, or Facebook. Search, advanced feeds, moderation, notifications automation, video processing, pagination, and production storage policies should be added before launch.
