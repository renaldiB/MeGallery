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
   * Capture photo frame directly into in-memory Blob
   * @param {number} quality JPEG quality between 0.1 and 1.0 (default 0.88)
   * @returns {Promise<Blob>}
   */
  async capture(quality = 0.88) {
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
