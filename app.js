/**
 * KARAKALEM - ANA UYGULAMA MOTORU
 * Sade Arayüz, Mükemmel Kamera & Split Slider
 * Geliştirici: Fatih PATIR (https://fatihpatir.github.io/web)
 */

class KarakalemApp {
  constructor() {
    this.engine = new SketchEngine();
    this.currentImage = null;
    this.currentStyle = 'portrait'; // 'portrait', 'sketch', 'caricature'
    this.lineIntensity = 65;
    this.shadingDepth = 55;
    this.soundEnabled = localStorage.getItem('karakalem_sound') !== 'false';
    this.audioCtx = null;
    this.renderTimer = null;

    // Split Slider
    this.splitPos = 0.5;
    this.isDragging = false;

    // Kamera
    this.stream = null;
    this.facingMode = 'environment';

    // PWA
    this.deferredPrompt = null;

    this.init();
  }

  init() {
    this.setupSplitSlider();
    this.setupPWA();
    this.updateSoundBtn();

    // Klavyeden ESC ile modalları kapat
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeCamera();
    });

    window.addEventListener('resize', () => {
      if (this.currentImage) this.updateSplitSlider();
    });
  }

  // ==========================================
  // SES SENTEZLEYİCİ (Web Audio API)
  // ==========================================
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const notes = [659.25, 880.00, 1046.50];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        }, i * 70);
      });
    } catch (e) {}
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('karakalem_sound', this.soundEnabled);
    this.updateSoundBtn();
    if (this.soundEnabled) this.playChime();
  }

  updateSoundBtn() {
    const btn = document.getElementById('btn-sound');
    if (btn) btn.textContent = this.soundEnabled ? '🔊' : '🔇';
  }

  // ==========================================
  // GÖRSEL YÜKLEME VE İŞLEME
  // ==========================================
  handleFileSelect(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      this.loadFile(files[0]);
    }
  }

  loadFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası seçiniz.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => this.displayImage(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  loadSample(type) {
    const img = SampleImages.createSample(type);
    img.onload = () => this.displayImage(img);
  }

  displayImage(img) {
    this.currentImage = img;

    // Görünümü değiştir
    document.getElementById('hero-upload').style.display = 'none';
    document.getElementById('stage-viewer').style.display = 'block';
    document.getElementById('stage-controls').style.display = 'flex';

    document.getElementById('before-img').src = img.src;

    this.render();
    this.playChime();
  }

  render() {
    if (!this.currentImage) return;

    const targetCanvas = document.getElementById('sketch-canvas');
    const result = this.engine.process(this.currentImage, {
      style: this.currentStyle,
      lineIntensity: this.lineIntensity,
      shadingDepth: this.shadingDepth,
      signature: true
    });

    targetCanvas.width = result.width;
    targetCanvas.height = result.height;
    const ctx = targetCanvas.getContext('2d');
    ctx.drawImage(result, 0, 0);

    this.updateSplitSlider();
  }

  setStyle(style) {
    this.currentStyle = style;
    document.querySelectorAll('.style-pill').forEach(p => p.classList.remove('active'));
    const btn = document.getElementById(`pill-${style}`);
    if (btn) btn.classList.add('active');

    // Stile göre varsayılan çizgi ayarları
    if (style === 'portrait') {
      this.lineIntensity = 65;
      this.shadingDepth = 55;
    } else if (style === 'sketch') {
      this.lineIntensity = 80;
      this.shadingDepth = 45;
    } else if (style === 'caricature') {
      this.lineIntensity = 90;
      this.shadingDepth = 70;
    }

    document.getElementById('range-lines').value = this.lineIntensity;
    document.getElementById('val-lines').textContent = `${this.lineIntensity}%`;
    document.getElementById('range-shading').value = this.shadingDepth;
    document.getElementById('val-shading').textContent = `${this.shadingDepth}%`;

    this.render();
  }

  onSliderChange(key, val) {
    const intVal = parseInt(val, 10);
    if (key === 'lineIntensity') {
      this.lineIntensity = intVal;
      document.getElementById('val-lines').textContent = `${intVal}%`;
    } else if (key === 'shadingDepth') {
      this.shadingDepth = intVal;
      document.getElementById('val-shading').textContent = `${intVal}%`;
    }

    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => {
      this.render();
    }, 60);
  }

  resetToUpload() {
    this.currentImage = null;
    document.getElementById('stage-viewer').style.display = 'none';
    document.getElementById('stage-controls').style.display = 'none';
    document.getElementById('hero-upload').style.display = 'flex';
    document.getElementById('file-input').value = '';
  }

  // ==========================================
  // SPLIT SLIDER (Öncesi / Sonrası)
  // ==========================================
  setupSplitSlider() {
    const viewer = document.getElementById('stage-viewer');

    const updatePos = (clientX) => {
      if (!this.isDragging) return;
      const rect = viewer.getBoundingClientRect();
      let pos = (clientX - rect.left) / rect.width;
      pos = Math.max(0.01, Math.min(0.99, pos));
      this.splitPos = pos;
      this.updateSplitSlider();
    };

    viewer.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      updatePos(e.clientX);
    });
    window.addEventListener('mousemove', (e) => updatePos(e.clientX));
    window.addEventListener('mouseup', () => { this.isDragging = false; });

    viewer.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      if (e.touches.length > 0) updatePos(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) updatePos(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => { this.isDragging = false; });
  }

  updateSplitSlider() {
    const beforeLayer = document.getElementById('before-layer');
    const splitLine = document.getElementById('split-line');
    const beforeImg = document.getElementById('before-img');
    const canvas = document.getElementById('sketch-canvas');

    const pct = this.splitPos * 100;
    beforeLayer.style.width = `${pct}%`;
    splitLine.style.left = `${pct}%`;

    if (canvas && beforeImg) {
      beforeImg.style.width = `${canvas.clientWidth}px`;
    }
  }

  // ==========================================
  // İNDİRME
  // ==========================================
  downloadSketch() {
    if (!this.currentImage) return;
    const canvas = document.getElementById('sketch-canvas');
    const a = document.createElement('a');
    a.download = `karakalem-fatih-patir-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png', 1.0);
    a.click();
    this.playChime();
  }

  // ==========================================
  // KAMERA YÖNETİMİ
  // ==========================================
  openCamera() {
    this.showModal('modal-camera');
    const video = document.getElementById('camera-video');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode }
      }).then((stream) => {
        this.stream = stream;
        video.srcObject = stream;
      }).catch(() => {
        alert('Kameraya erişilemedi.');
        this.closeCamera();
      });
    } else {
      alert('Kamera desteklenmiyor.');
      this.closeCamera();
    }
  }

  flipCamera() {
    this.facingMode = (this.facingMode === 'environment') ? 'user' : 'environment';
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    this.openCamera();
  }

  takeSnap() {
    const video = document.getElementById('camera-video');
    if (!video.videoWidth) return;

    const temp = document.createElement('canvas');
    temp.width = video.videoWidth;
    temp.height = video.videoHeight;
    temp.getContext('2d').drawImage(video, 0, 0);

    const img = new Image();
    img.onload = () => {
      this.displayImage(img);
      this.closeCamera();
    };
    img.src = temp.toDataURL('image/jpeg', 0.95);
  }

  closeCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.hideModal('modal-camera');
  }

  // ==========================================
  // MODAL VE PWA
  // ==========================================
  showModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }

  hideModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  setupPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }

    const installBtn = document.getElementById('btn-install');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (installBtn) installBtn.style.display = 'flex';
    });
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then(() => {
        this.deferredPrompt = null;
        document.getElementById('btn-install').style.display = 'none';
      });
    }
  }
}

let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new KarakalemApp();
});
