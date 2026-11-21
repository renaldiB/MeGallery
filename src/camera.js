/**
 * In-App Camera Controller using HTML5 MediaDevices & Canvas
 * Guaranteed zero OS gallery write - completely isolated in browser memory.
 */

export class CameraController {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.stream = null;
    this.facingMode = 'environment'; // 'environment' (back) or 'user' (front)
    this.torchOn = false;
    this.isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Start camera stream
   */
  async start(preferredFacingMode = this.facingMode) {
    if (!this.isSupported) {
      throw new Error('Web Camera API (getUserMedia) tidak didukung pada browser ini.');
    }

    this.stop(); // Stop any active track first
    this.facingMode = preferredFacingMode;

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: this.facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      return true;
    } catch (err) {
      // Fallback: try relaxed constraints if ideal resolution failed
      console.warn('Initial camera constraints failed, attempting fallback...', err);
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: this.facingMode }
        });
        this.video.srcObject = this.stream;
        await this.video.play();
        return true;
      } catch (fallbackErr) {
        throw new Error('Gagal mengakses kamera: ' + fallbackErr.message);
      }
    }
  }

  /**
   * Toggle between back and front camera
   */
  async switchCamera() {
    const nextMode = this.facingMode === 'environment' ? 'user' : 'environment';
    return this.start(nextMode);
  }

  /**
   * Check if torch/flashlight is supported
   */
  hasTorch() {
    if (!this.stream) return false;
    const track = this.stream.getVideoTracks()[0];
    if (!track) return false;
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    return !!capabilities.torch;
  }

  /**
   * Toggle torch on/off
   */
  async toggleTorch() {
    if (!this.stream) return false;
    const track = this.stream.getVideoTracks()[0];
    if (!track || !this.hasTorch()) return false;

    this.torchOn = !this.torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: this.torchOn }]
      });
      return this.torchOn;
    } catch (err) {
      console.warn('Gagal mengubah status flash/torch:', err);
      this.torchOn = false;
      return false;
    }
  }

  /**
   * Focus camera at specific coordinates
   * @param {number} x Click X coordinate
   * @param {number} y Click Y coordinate
   * @param {number} containerWidth Width of viewfinder
   * @param {number} containerHeight Height of viewfinder
   */
  async focusAt(x, y, containerWidth, containerHeight) {
    if (!this.stream) return;
    const track = this.stream.getVideoTracks()[0];
    if (!track) return;

    // Trigger subtle haptic pulse
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([12]);
      } catch (_) {}
    }

    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    const constraints = {};

    // Normalize coordinates (0.0 to 1.0)
    const normX = Math.min(Math.max(x / containerWidth, 0), 1);
    const normY = Math.min(Math.max(y / containerHeight, 0), 1);

    if (capabilities.pointsOfInterest) {
      constraints.pointsOfInterest = [{ x: normX, y: normY }];
    }

    if (capabilities.focusMode) {
      if (capabilities.focusMode.includes('continuous')) {
        constraints.focusMode = 'continuous';
      } else if (capabilities.focusMode.includes('single-shot')) {
        constraints.focusMode = 'single-shot';
      }
    }

    if (Object.keys(constraints).length > 0) {
      try {
        await track.applyConstraints({ advanced: [constraints] });
      } catch (err) {
        // Many mobile browsers emulate focus visually while stream maintains best autofocus
        console.debug('Hardware focus constraint application:', err.message);
      }
    }
  }

  /**
   * Render high-contrast location & timestamp watermark onto canvas
   */
  renderWatermark(ctx, width, height, locationData, dateData) {
    if (!dateData) return;

    ctx.save();
    const fontSize = Math.max(Math.round(width * 0.022), 16);
    const smallFontSize = Math.max(Math.round(fontSize * 0.78), 12);
    const padding = Math.max(Math.round(width * 0.025), 18);
    const lineHeight = Math.round(fontSize * 1.35);

    // Subtle dark gradient protector at bottom for 100% legibility on white/bright scenes
    const gradHeight = Math.max(Math.round(height * 0.16), lineHeight * 4 + padding * 2);
    const grad = ctx.createLinearGradient(0, height - gradHeight, 0, height);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, height - gradHeight, width, gradHeight);

    // Text styling with drop shadow
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = Math.max(Math.round(fontSize * 0.22), 3);
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // 1. Right-Bottom Timestamp (Day, DD Month YYYY \n HH:mm:ss)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const timeY = height - padding;
    const dateY = timeY - lineHeight;

    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(dateData.timeLine, width - padding, timeY);

    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(dateData.dateLine, width - padding, dateY);

    // 2. Left-Bottom Location (Desa/Kelurahan, Kecamatan, Kota/Kabupaten, GPS)
    if (locationData && (locationData.primaryText || locationData.coordsText)) {
      ctx.textAlign = 'left';
      const locLine3Y = height - padding;
      const locLine2Y = locLine3Y - Math.round(lineHeight * 0.85);
      const locLine1Y = locLine2Y - Math.round(lineHeight * 0.9);

      // Line 1: Village & District
      ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(`📍 ${locationData.primaryText}`, padding, locLine1Y);

      // Line 2: Regency & Province
      if (locationData.secondaryText) {
        ctx.font = `500 ${Math.round(fontSize * 0.9)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(locationData.secondaryText, padding + Math.round(fontSize * 1.1), locLine2Y);
      }

      // Line 3: Exact Coordinates & GPS Accuracy
      if (locationData.coordsText) {
        ctx.font = `400 ${smallFontSize}px monospace`;
        ctx.fillStyle = '#FFFA8D'; // Subtle warm lemon for GPS accuracy
        ctx.fillText(locationData.coordsText, padding + Math.round(fontSize * 1.1), locLine3Y);
      }
    }

    ctx.restore();
  }

  /**
   * Capture photo frame directly into in-memory Blob
   * @param {number} quality JPEG quality between 0.1 and 1.0 (default 0.88)
   * @param {object} watermarkOptions Optional { enabled, location, timestamp }
   * @returns {Promise<Blob>}
   */
  async capture(quality = 0.88, watermarkOptions = null) {
    if (!this.stream || !this.video.videoWidth) {
      throw new Error('Kamera belum siap untuk mengambil foto.');
    }

    // Trigger haptic feedback on supported mobile devices
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([20]);
      } catch (_) {}
    }

    const width = this.video.videoWidth;
    const height = this.video.videoHeight;

    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext('2d');
    
    // If front camera, mirror image for natural selfie feel
    if (this.facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(this.video, 0, 0, width, height);

    // Reset transform matrix before drawing watermark
    if (this.facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Render watermark onto canvas frame if enabled
    if (watermarkOptions && watermarkOptions.enabled !== false && watermarkOptions.timestamp) {
      this.renderWatermark(
        ctx,
        width,
        height,
        watermarkOptions.location,
        watermarkOptions.timestamp
      );
    }

    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas gagal mengonversi frame ke Blob.'));
          }
        },
        'image/jpeg',
        quality
      );
    });
  }

  /**
   * Stop active camera stream
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.torchOn = false;
  }
}
