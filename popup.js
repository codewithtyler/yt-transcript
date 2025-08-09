// YouTube Transcript Extractor Popup Script

class TranscriptExtractorPopup {
  constructor() {
    this.currentTranscript = null;
    this.currentVideoInfo = null;
    this.init();
  }

  async init() {
    // Check if we're on a YouTube video page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('youtube.com/watch')) {
      this.showNotYouTubePage();
      return;
    }

    // Get video info and setup event listeners
    await this.loadVideoInfo();
    this.setupEventListeners();
  }

  showNotYouTubePage() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('notYouTube').style.display = 'block';
  }

  async loadVideoInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Extract video info from URL and page title
      const videoId = new URLSearchParams(new URL(tab.url).search).get('v');
      const title = tab.title.replace(' - YouTube', '');
      
      document.getElementById('videoTitle').textContent = title;
      document.getElementById('videoUrl').textContent = tab.url;
      document.getElementById('videoInfo').style.display = 'block';
      
    } catch (error) {
      console.error('Error loading video info:', error);
      this.showStatus('Error loading video information', 'error');
    }
  }

  setupEventListeners() {
    // Extract button
    document.getElementById('extractBtn').addEventListener('click', () => {
      this.extractTranscript();
    });

    // Copy button
    document.getElementById('copyBtn').addEventListener('click', () => {
      this.copyToClipboard();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => {
      this.downloadTranscript();
    });
  }

  async extractTranscript() {
    const extractBtn = document.getElementById('extractBtn');
    const originalText = extractBtn.textContent;
    
    try {
      // Update UI to show loading state
      extractBtn.disabled = true;
      extractBtn.innerHTML = '<span class="loading-spinner"></span> Extracting...';
      this.showStatus('Extracting transcript...', 'loading');
      
      // Get timestamp preference
      const includeTimestamps = document.getElementById('includeTimestamps')?.checked || false;
      
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractTranscript',
        includeTimestamps: includeTimestamps
      });

      if (response.success) {
        this.currentTranscript = response.transcript;
        this.currentVideoInfo = response.videoInfo;
        
        this.showStatus(`Successfully extracted ${response.transcript.length} transcript segments!`, 'success');
        this.showOptions();
        this.showExportControls();
        
        extractBtn.textContent = 'Extract Again';
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('Extraction failed:', error);
      this.showStatus(`Failed to extract transcript: ${error.message}`, 'error');
    } finally {
      extractBtn.disabled = false;
      if (extractBtn.textContent.includes('Extracting')) {
        extractBtn.textContent = originalText;
      }
    }
  }

  showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
  }

  showOptions() {
    const optionsElement = document.getElementById('options');
    if (optionsElement) {
      optionsElement.style.display = 'block';
    }
  }

  showExportControls() {
    const exportElement = document.getElementById('exportControls');
    if (exportElement) {
      exportElement.style.display = 'block';
    }
  }

  async copyToClipboard() {
    try {
      const format = document.querySelector('input[name="format"]:checked')?.value || 'text';
      const includeTimestamps = document.getElementById('includeTimestamps')?.checked || false;
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getFormattedTranscript',
        format: format,
        includeTimestamps: includeTimestamps
      });

      if (response && response.success) {
        await navigator.clipboard.writeText(response.formattedTranscript);
        this.showStatus('Copied to clipboard!', 'success');
      } else {
        throw new Error('Failed to get formatted transcript');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      this.showStatus('Failed to copy to clipboard', 'error');
    }
  }

  async downloadTranscript() {
    try {
      const format = document.querySelector('input[name="format"]:checked')?.value || 'text';
      const includeTimestamps = document.getElementById('includeTimestamps')?.checked || false;
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getFormattedTranscript',
        format: format,
        includeTimestamps: includeTimestamps
      });

      if (response && response.success) {
        // Generate filename
        const videoTitle = this.currentVideoInfo?.title || 'youtube-video';
        const sanitizedTitle = videoTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        let extension;
        let mimeType;
        
        if (format === 'markdown') {
          extension = 'md';
          mimeType = 'text/markdown';
        } else {
          extension = 'txt';
          mimeType = 'text/plain';
        }
        
        const blob = new Blob([response.formattedTranscript], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizedTitle}-transcript.${extension}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showStatus('Download started!', 'success');
      } else {
        throw new Error('Failed to get formatted transcript');
      }
    } catch (error) {
      console.error('Download failed:', error);
      this.showStatus('Failed to download transcript', 'error');
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TranscriptExtractorPopup();
});
