/* =========================================
   QR Gen — Application Logic
   ========================================= */

(function () {
  'use strict';

  // --- DOM Elements ---
  const urlInput       = document.getElementById('url-input');
  const clearBtn       = document.getElementById('clear-btn');
  const generateBtn    = document.getElementById('generate-btn');
  const errorMsg       = document.getElementById('error-msg');
  const inputWrapper   = document.getElementById('input-wrapper');
  const adGate         = document.getElementById('ad-gate');
  const countdownFill  = document.getElementById('countdown-fill');
  const countdownNum   = document.getElementById('countdown-num');
  const qrResult       = document.getElementById('qr-result');
  const qrCanvas       = document.getElementById('qr-canvas');
  const downloadBtn    = document.getElementById('download-btn');
  const copyBtn        = document.getElementById('copy-btn');
  const newBtn         = document.getElementById('new-btn');
  const qrUrlDisplay   = document.getElementById('qr-url-display');
  const inputSection   = document.querySelector('.input-section');

  let qrInstance = null;
  const AD_COUNTDOWN_SECONDS = 5;

  // --- URL Validation ---
  function isValidUrl(string) {
    // Allow URLs with or without protocol
    let url = string.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    try {
      const parsed = new URL(url);
      // Must have a dot in hostname (e.g., example.com)
      return parsed.hostname.includes('.');
    } catch {
      return false;
    }
  }

  function normalizeUrl(string) {
    let url = string.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    return url;
  }

  // --- Input Handling ---
  urlInput.addEventListener('input', () => {
    const value = urlInput.value.trim();
    clearBtn.style.display = value.length > 0 ? 'flex' : 'none';
    generateBtn.disabled = value.length === 0;

    // Clear error when user types
    if (errorMsg.textContent) {
      errorMsg.textContent = '';
      inputWrapper.classList.remove('error');
    }
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.style.display = 'none';
    generateBtn.disabled = true;
    errorMsg.textContent = '';
    inputWrapper.classList.remove('error');
    urlInput.focus();
  });

  // --- Generate Flow ---
  generateBtn.addEventListener('click', handleGenerate);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !generateBtn.disabled) {
      handleGenerate();
    }
  });

  function handleGenerate() {
    const raw = urlInput.value.trim();

    if (!raw) return;

    if (!isValidUrl(raw)) {
      errorMsg.textContent = 'Please enter a valid URL (e.g., example.com or https://example.com)';
      inputWrapper.classList.add('error');
      urlInput.focus();
      return;
    }

    errorMsg.textContent = '';
    inputWrapper.classList.remove('error');

    // Register the Monetag service worker for push notifications
    registerServiceWorker();

    // Show ad-gate countdown
    showAdGate();
  }

  // --- Service Worker Registration (Monetag Push Notifications) ---
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/monetag/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Monetag SW registered:', registration.scope);
        })
        .catch((err) => {
          console.log('Monetag SW registration skipped:', err.message);
        });
    }
  }

  // --- Ad Gate (Countdown) ---
  function showAdGate() {
    adGate.classList.remove('hidden');
    let remaining = AD_COUNTDOWN_SECONDS;
    countdownNum.textContent = remaining;
    countdownFill.style.width = '0%';

    // Force reflow then animate
    countdownFill.offsetHeight;

    const interval = setInterval(() => {
      remaining--;
      countdownNum.textContent = remaining;
      const progress = ((AD_COUNTDOWN_SECONDS - remaining) / AD_COUNTDOWN_SECONDS) * 100;
      countdownFill.style.width = progress + '%';

      if (remaining <= 0) {
        clearInterval(interval);
        countdownFill.style.width = '100%';
        setTimeout(() => {
          adGate.classList.add('hidden');
          generateQR();
        }, 400);
      }
    }, 1000);
  }

  // --- QR Code Generation ---
  function generateQR() {
    const url = normalizeUrl(urlInput.value.trim());

    // Clear previous QR
    qrCanvas.innerHTML = '';
    if (qrInstance) {
      qrInstance = null;
    }

    // Create new QR code
    qrInstance = new QRCode(qrCanvas, {
      text: url,
      width: 220,
      height: 220,
      colorDark: '#0a0a0f',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });

    // Show result, hide input
    qrUrlDisplay.textContent = url;
    inputSection.style.display = 'none';
    qrResult.classList.remove('hidden');

    // Re-trigger animation
    qrResult.style.animation = 'none';
    qrResult.offsetHeight;
    qrResult.style.animation = '';
  }

  // --- Download QR as PNG ---
  downloadBtn.addEventListener('click', () => {
    const canvas = qrCanvas.querySelector('canvas');
    const img = qrCanvas.querySelector('img');

    if (canvas) {
      downloadCanvas(canvas);
    } else if (img) {
      // QRCode.js might render as <img> in some browsers
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 220;
      tempCanvas.height = 220;
      const ctx = tempCanvas.getContext('2d');
      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';
      tempImg.onload = () => {
        ctx.drawImage(tempImg, 0, 0, 220, 220);
        downloadCanvas(tempCanvas);
      };
      tempImg.src = img.src;
    }
  });

  function downloadCanvas(canvas) {
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // --- Copy QR Image ---
  copyBtn.addEventListener('click', async () => {
    const canvas = qrCanvas.querySelector('canvas');
    if (!canvas) return;

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      showCopiedFeedback();
    } catch {
      // Fallback: copy the data URL as text
      try {
        await navigator.clipboard.writeText(canvas.toDataURL('image/png'));
        showCopiedFeedback();
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  });

  function showCopiedFeedback() {
    const span = copyBtn.querySelector('span');
    const original = span.textContent;
    span.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      span.textContent = original;
      copyBtn.classList.remove('copied');
    }, 2000);
  }

  // --- New QR ---
  newBtn.addEventListener('click', () => {
    qrResult.classList.add('hidden');
    inputSection.style.display = '';
    urlInput.value = '';
    clearBtn.style.display = 'none';
    generateBtn.disabled = true;
    urlInput.focus();
  });
})();
