# YouTube Clipper

A simple web app to clip and download YouTube video segments.

## Features
- Clip YouTube videos to any length
- Download in MP4 format
- Fast processing with yt-dlp
- Clean, modern UI

## Requirements
- Node.js 14+
- Python 3.8+
- npm

## Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip3 install -U yt-dlp
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage
1. Enter YouTube URL
2. Select clip times
3. Download

## Troubleshooting
- If download fails, check your internet connection
- Make sure the video isn't private/restricted
- Try refreshing if the player doesn't load

## Development
- Backend runs on port 3000
- Frontend runs on port 5173
- Uses yt-dlp for video processing