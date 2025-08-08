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

  // Find the transcript button
  async findTranscriptButton() {
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

    return transcriptButton;
  }

  // Wait for transcript segments to load with actual content
  waitForTranscriptSegments() {
    return new Promise((resolve, reject) => {
      const maxWaitTime = 10000; // 10 seconds max
      const startTime = Date.now();
      
      const checkForSegments = () => {
        const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
        
        // Check if we have segments with actual text content
        if (segments.length > 0) {
          let segmentsWithText = 0;
          segments.forEach(segment => {
            const text = segment.textContent.trim();
            if (text && text.length > 0) {
              segmentsWithText++;
            }
          });
          
          // If we have at least 3 segments with text, or it's been 3+ seconds with some content
          if (segmentsWithText >= 3 || (segmentsWithText > 0 && Date.now() - startTime > 3000)) {
            resolve(segments);
            return;
          }
        }
        
        // Check timeout
        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Timeout waiting for transcript segments to load'));
          return;
        }
        
        // Continue checking
        setTimeout(checkForSegments, 200);
      };
      
      checkForSegments();
    });
  }

  // Open transcript panel and wait for content to load
  async openAndWaitForTranscript() {
    try {
      const transcriptButton = await this.findTranscriptButton();
      
      if (!transcriptButton) {
        throw new Error('Transcript button not found. This video may not have a transcript available.');
      }

      // Click to open
      transcriptButton.click();
      
      // Wait for segments to load with content
      await this.waitForTranscriptSegments();
      
      return transcriptButton; // Return button reference so we can close it later
    } catch (error) {
      console.error('Error opening transcript panel:', error);
      throw error;
    }
  }

  // Extract transcript text from the opened panel
  async extractTranscriptText(includeTimestamps = false) {
    try {
      const segments = document.querySelectorAll('ytd-transcript-segment-renderer');

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

  // Main extraction method with open/close
  async extractTranscript(includeTimestamps = false) {
    if (this.isExtracting) {
      throw new Error('Extraction already in progress');
    }

    this.isExtracting = true;
    let transcriptButton = null;
    
    try {
      console.log('Opening transcript panel...');
      transcriptButton = await this.openAndWaitForTranscript();
      
      console.log('Extracting transcript text...');
      const transcript = await this.extractTranscriptText(includeTimestamps);
      
      // Close the transcript panel
      if (transcriptButton) {
        console.log('Closing transcript panel...');
        transcriptButton.click();
      }
      
      this.transcript = transcript;
      this.isExtracting = false;
      
      console.log(`Extracted ${transcript.length} transcript segments`);
      return transcript;
      
    } catch (error) {
      // Make sure to close panel if something went wrong
      if (transcriptButton) {
        try {
          transcriptButton.click();
        } catch (closeError) {
          console.warn('Could not close transcript panel:', closeError);
        }
      }
      
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
  formatAsText(includeTimestamps = false) {
    if (!this.transcript.length) return '';
    
    let output = '';
    
    this.transcript.forEach(segment => {
      if (includeTimestamps && segment.timestamp) {
        output += `[${segment.timestamp}] ${segment.text}\n`;
      } else {
        output += `${segment.text}\n`;
      }
    });
    
    return output.trim();
  }

  // Format transcript as markdown  
  formatAsMarkdown(includeTimestamps = false) {
    if (!this.transcript.length) return '';
    
    let output = '';
    
    this.transcript.forEach(segment => {
      if (includeTimestamps && segment.timestamp) {
        output += `**[${segment.timestamp}]** ${segment.text}\n\n`;
      } else {
        output += `${segment.text}\n\n`;
      }
    });
    
    return output.trim();
  }
}

// Create global instance
window.youtubeTranscriptExtractor = new YouTubeTranscriptExtractor();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractTranscript') {
    const includeTimestamps = request.includeTimestamps || false;
    
    window.youtubeTranscriptExtractor.extractTranscript(includeTimestamps)
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
    const includeTimestamps = request.includeTimestamps || false;
    let formattedTranscript = '';
    
    try {
      if (format === 'markdown') {
        formattedTranscript = window.youtubeTranscriptExtractor.formatAsMarkdown(includeTimestamps);
      } else {
        formattedTranscript = window.youtubeTranscriptExtractor.formatAsText(includeTimestamps);
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