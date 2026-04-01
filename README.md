# WICS Schedule Compare

A simple first version of a two-file PDF inventory comparison app for weekly broadcast schedules.

## What it does
- Upload exactly two PDFs: previous week and current week
- Extract text from both PDFs
- Build a unique title inventory from each file
- Compare the two lists
- Return:
  - Added
  - Removed
  - Unchanged
  - Possible Match

## Stack
- Next.js App Router
- Tailwind CSS
- pdf-parse
- Netlify-ready setup

## Run locally
```bash
npm install
npm run dev
```

## Deploy to Netlify
1. Push this folder to GitHub
2. Import the repo into Netlify
3. Build command: `npm run build`
4. Publish directory: leave Netlify Next.js defaults enabled

## Notes
- This first version is built for text-based PDFs.
- It does not use AI.
- It does not persist uploads.
- It is intentionally simple and cheap to run.
