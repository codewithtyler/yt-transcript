# YouTube Transcript Extractor Chrome Extension

A simple Chrome extension that extracts transcripts from YouTube videos by scraping the built-in transcript feature.

## Features

- 📝 Extract transcripts from any YouTube video with available transcripts
- 🕐 Preserves timestamps for each transcript segment
- 📋 Copy transcript to clipboard
- 💾 Download transcript as text or JSON file
- 🎯 Works entirely client-side - no API keys required
- 🔄 Handles both auto-generated and manual transcripts

## Installation

1. Download or clone all the files to a folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension icon should appear in your Chrome toolbar

## Required Files

Make sure you have these files in your extension folder:
- `manifest.json` - Extension configuration
- `content.js` - Main transcript extraction logic
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality
- Icon files (optional, but recommended):
  - `icon16.png` (16x16 pixels)
  - `icon48.png` (48x48 pixels) 
  - `icon128.png` (128x128 pixels)

## Usage

1. Navigate to any YouTube video page
2. Click the extension icon in your Chrome toolbar
3. Click "Extract Transcript" button
4. Choose your preferred format (Plain Text or JSON)
5. Copy to clipboard or download the transcript

## How It Works

The extension uses a content script that:
1. Finds YouTube's built-in "Show transcript" button
2. Programmatically clicks it to open the transcript panel
3. Scrapes the transcript segments from the DOM
4. Formats the data with timestamps and text
5. Provides export options through the popup interface

## Troubleshooting

**"Transcript button not found" error:**
- The video may not have a transcript available
- Try refreshing the page and waiting for it to fully load
- Some videos (especially very new ones) may not have transcripts yet

**Extension doesn't appear:**
- Make sure you've enabled Developer mode in `chrome://extensions/`
- Check that all required files are in the same folder
- Try reloading the extension

**Transcript extraction fails:**
- YouTube occasionally updates their page structure
- Try refreshing the YouTube page
- The transcript panel might take a moment to load

## Output Formats

### Plain Text Format
```
YouTube Transcript
Title: Video Title Here
URL: https://youtube.com/watch?v=...
Extracted: 1/1/2024, 12:00:00 PM

[0:00] First segment of transcript text
[0:15] Second segment continues here
[0:30] And so on...
```

### JSON Format
```json
{
  "videoInfo": {
    "title": "Video Title Here",
    "url": "https://youtube.com/watch?v=...",
    "videoId": "dQw4w9WgXcQ",
    "extractedAt": "2024-01-01T17:00:00.000Z"
  },
  "transcript": [
    {
      "timestamp": "0:00",
      "text": "First segment of transcript text",
      "index": 0
    }
  ]
}
```

## Technical Notes

- Uses Manifest V3 for modern Chrome extension standards
- Requires `activeTab` and `scripting` permissions
- Only runs on `*.youtube.com/watch*` pages
- No external API calls or data collection
- All processing happens locally in your browser

## Limitations

- Only works on videos that have transcripts enabled
- Relies on YouTube's existing transcript UI (may break if YouTube changes their interface)
- Cannot generate transcripts for videos that don't have them
- Auto-generated transcripts may have accuracy issues (this is a YouTube limitation, not the extension)

## Contributing

Feel free to submit issues or improvements! The extension is designed to be simple and reliable.

## License

Open source - feel free to modify and distribute.