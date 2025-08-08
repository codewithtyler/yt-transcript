// YouTube Transcript Extractor Content Script

class YouTubeTranscriptExtractor {
  constructor() {
    this.transcript = [];
    this.isExtracting = false;
  }

  // Wait for element to appear in DOM
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  // Find and click the transcript button
  async openTranscriptPanel() {
    try {
      // Look for the "Show transcript" button - YouTube uses different selectors
      const transcriptSelectors = [
        'button[aria-label*="transcript" i]',
        'button[aria-label*="Show transcript"]',
        '[role="button"][aria-label*="transcript" i]',
        'ytd-toggle-button-renderer button[aria-label*="transcript" i]'
      ];

      let transcriptButton = null;
      
      for (const selector of transcriptSelectors) {
        transcriptButton = document.querySelector(selector);
        if (transcriptButton) break;
      }

      if (!transcriptButton) {
        // Try to find it in the description area
        await this.waitForElement('#description', 5000);
        
        for (const selector of transcriptSelectors) {
          transcriptButton = document.querySelector(selector);
          if (transcriptButton) break;
        }
      }

      if (!transcriptButton) {
        throw new Error('Transcript button not found. This video may not have a transcript available.');
      }

      // Click the transcript button
      transcriptButton.click();
      
      // Wait for the transcript panel to load
      await this.waitForElement('ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer', 5000);
      
      return true;
    } catch (error) {
      console.error('Error opening transcript panel:', error);
      throw error;
    }
  }

  // Extract transcript text from the opened panel
  async extractTranscriptText() {
    try {
      // Wait a bit for the transcript to fully load
      await new Promise(resolve => setTimeout(resolve, 1000));

      const transcriptSelectors = [
        'ytd-transcript-segment-renderer',
        '.ytd-transcript-segment-renderer',
        '[role="button"][tabindex="0"]' // Fallback selector for transcript segments
      ];

      let segments = null;
      
      for (const selector of transcriptSelectors) {
        segments = document.querySelectorAll(selector);
        if (segments.length > 0) break;
      }

      if (!segments || segments.length === 0) {
        throw new Error('Transcript segments not found in the panel.');
      }

      const transcript = [];
      
      segments.forEach((segment, index) => {
        try {
          // Try different ways to extract timestamp and text
          const timeElement = segment.querySelector('.segment-timestamp, [class*="timestamp"]');
          const textElement = segment.querySelector('.segment-text, [class*="segment-text"], .ytd-transcript-segment-renderer');
          
          let timestamp = '';
          let text = '';

          if (timeElement) {
            timestamp = timeElement.textContent.trim();
          }

          if (textElement) {
            text = textElement.textContent.trim();
            // Remove timestamp from text if it's included
            text = text.replace(/^\d+:\d+/, '').trim();
          } else {
            // Fallback: get all text content and try to parse
            const fullText = segment.textContent.trim();
            const timeMatch = fullText.match(/^(\d+:\d+)/);
            if (timeMatch) {
              timestamp = timeMatch[1];
              text = fullText.replace(timeMatch[0], '').trim();
            } else {
              text = fullText;
            }
          }

          if (text && text.length > 0) {
            transcript.push({
              timestamp: timestamp,
              text: text,
              index: index
            });
          }
        } catch (segmentError) {
          console.warn('Error processing segment:', segmentError);
        }
      });

      return transcript;
    } catch (error) {
      console.error('Error extracting transcript text:', error);
      throw error;
    }
  }

  // Main extraction method
  async extractTranscript() {
    if (this.isExtracting) {
      throw new Error('Extraction already in progress');
    }

    this.isExtracting = true;
    
    try {
      console.log('Opening transcript panel...');
      await this.openTranscriptPanel();
      
      console.log('Extracting transcript text...');
      const transcript = await this.extractTranscriptText();
      
      this.transcript = transcript;
      this.isExtracting = false;
      
      console.log(`Extracted ${transcript.length} transcript segments`);
      return transcript;
      
    } catch (error) {
      this.isExtracting = false;
      console.error('Transcript extraction failed:', error);
      throw error;
    }
  }

  // Get video title and URL for context
  getVideoInfo() {
    const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1')?.textContent?.trim() || 'Unknown Title';
    const url = window.location.href;
    const videoId = new URLSearchParams(window.location.search).get('v');
    
    return {
      title,
      url,
      videoId,
      extractedAt: new Date().toISOString()
    };
  }

  // Format transcript as plain text
  formatAsText() {
    if (!this.transcript.length) return '';
    
    const videoInfo = this.getVideoInfo();
    let output = `YouTube Transcript\n`;
    output += `Title: ${videoInfo.title}\n`;
    output += `URL: ${videoInfo.url}\n`;
    output += `Extracted: ${new Date(videoInfo.extractedAt).toLocaleString()}\n\n`;
    
    this.transcript.forEach(segment => {
      if (segment.timestamp) {
        output += `[${segment.timestamp}] ${segment.text}\n`;
      } else {
        output += `${segment.text}\n`;
      }
    });
    
    return output;
  }

  // Format transcript as JSON
  formatAsJSON() {
    const videoInfo = this.getVideoInfo();
    return JSON.stringify({
      videoInfo,
      transcript: this.transcript
    }, null, 2);
  }
}

// Create global instance
window.youtubeTranscriptExtractor = new YouTubeTranscriptExtractor();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractTranscript') {
    window.youtubeTranscriptExtractor.extractTranscript()
      .then(transcript => {
        sendResponse({
          success: true,
          transcript: transcript,
          videoInfo: window.youtubeTranscriptExtractor.getVideoInfo()
        });
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
  
  if (request.action === 'getFormattedTranscript') {
    const format = request.format || 'text';
    let formattedTranscript = '';
    
    try {
      if (format === 'json') {
        formattedTranscript = window.youtubeTranscriptExtractor.formatAsJSON();
      } else {
        formattedTranscript = window.youtubeTranscriptExtractor.formatAsText();
      }
      
      sendResponse({
        success: true,
        formattedTranscript: formattedTranscript
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
});