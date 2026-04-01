# WICS Compare

A simple first version of a two-file PDF show inventory comparison tool.

## What it does
- Upload previous and current weekly PDF files
- Extract text from both PDFs
- Build a unique title inventory from each
- Compare shows as added, removed, unchanged, or possible match

## Important for Netlify
This project pins Node 20 because your original failure came from Netlify building with Node 22.

Included fixes:
- `.nvmrc` with `20`
- `package.json` engines set to `20.x`
- `netlify.toml` with `NODE_VERSION = "20"`

## Run locally
npm install
npm run dev
