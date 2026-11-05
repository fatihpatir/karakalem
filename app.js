/**
 * KARAKALEM ATÖLYESİ - ANA UYGULAMA MOTORU
 * Split Slider, Ressam Çiziyor Animasyonu, Kamera, Ses Sentezleyici & PWA
 * Geliştirici: Fatih PATIR (https://fatihpatir.github.io/web)
 */

class KarakalemApp {
  constructor() {
    this.engine = new SketchEngine();
    this.currentImage = null;
    this.currentPreset = 'classic';
    this.soundEnabled = localStorage.getItem('karakalem_sound') !== 'false';
    this.audioCtx = null;
    
    // Ayarlar
    this.settings = {
      hardness: 50,
      strokeWeight: 50,
      hatchIntensity: 50,
      smudgeAmount: 50,
      paperTexture: 50,
      signature: true
    };

    // Karşılaştırma Kaydırıcısı (Split Viewer)
    this.splitPosition = 0.5;
    this.isDragging = false;

    // Kamera
    this.cameraStream = null;
    this.cameraFacing = 'environment'; // 'user' veya 'environment'

    // PWA
    this.deferredPrompt = null;

    this.init();
  }

  init() {
    this.setupUI();
    this.setupDragAndDrop();
    this.setupSplitSlider();
    this.setupPWA();
    this.updateSoundBtn();

    // Sayfa açıldığında otomatik olarak örnek bir portre yükle
    setTimeout(() => {
      this.loadSample('portrait');
    }, 400);
  }

  setupUI() {
    // Escape tuşu ile modalları kapatma
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Pencere boyutu değiştiğinde kaydırıcıyı yeniden hizala
    window.addEventListener('resize', () => {
      if (this.currentImage) {
        this.updateSplitView();
      }
    });
  }

  // ==========================================
  // SES SENTEZLEYİCİ (Web Audio API - Kurşun Kalem Sesi)
  // ==========================================
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playPencilScratch(duration = 0.12) {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      // Beyaz gürültü + Bant geçiren filtre ile kurşun kalemin kağıda sürtünme sesi simülasyonu
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 + Math.random() * 800, ctx.currentTime);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
    } catch (e) {
      console.warn('Ses hatası:', e);
    }
  }

  playSuccessChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const notes = [587.33, 739.99, 880.00, 1174.66]; // D majör akoru
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }, idx * 90);
      });
    } catch (e) {}
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('karakalem_sound', this.soundEnabled);
    this.updateSoundBtn();
    if (this.soundEnabled) {
      this.playSuccessChime();
    }
  }

  updateSoundBtn() {
    const btn = document.getElementById('btn-sound');
    if (btn) {
      btn.textContent = this.soundEnabled ? '🔊' : '🔇';
      btn.title = this.soundEnabled ? 'Kalem Sesini Kapat' : 'Kalem Sesini Aç';
    }
  }

  // ==========================================
  // GÖRSEL YÜKLEME VE İŞLEME
  // ==========================================
  setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const emptyState = document.getElementById('empty-state');

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        emptyState.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        emptyState.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        this.loadFile(files[0]);
      }
    });
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      this.loadFile(files[0]);
    }
  }

  loadFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası (JPG, PNG vb.) seçiniz.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.displayImage(img);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  loadSample(type) {
    const img = SampleImages.createSample(type);
    img.onload = () => {
      this.displayImage(img);
    };
  }

  displayImage(img) {
    this.currentImage = img;

    // Arayüzü hazırla
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('comparison-container').style.display = 'block';

    const origImgEl = document.getElementById('original-image');
    origImgEl.src = img.src;

    const dimLabel = document.getElementById('image-dimensions');
    dimLabel.textContent = `${img.naturalWidth || img.width} × ${img.naturalHeight || img.height} px`;

    // Çizimi yap
    this.renderSketch();
    this.updateSplitView();
    this.playSuccessChime();
  }

  // ==========================================
  // KARAKALEM ÇİZİMİ ÇALIŞTIRMA
  // ==========================================
  renderSketch() {
    if (!this.currentImage) return;

    const targetCanvas = document.getElementById('sketch-canvas');
    const resultCanvas = this.engine.process(this.currentImage, {
      style: this.currentPreset,
      hardness: this.settings.hardness,
      strokeWeight: this.settings.strokeWeight,
      hatchIntensity: this.settings.hatchIntensity,
      smudgeAmount: this.settings.smudgeAmount,
      paperTexture: this.settings.paperTexture,
      signature: this.settings.signature
    });

    targetCanvas.width = resultCanvas.width;
    targetCanvas.height = resultCanvas.height;
    const ctx = targetCanvas.getContext('2d');
    ctx.drawImage(resultCanvas, 0, 0);

    this.updateSplitView();
  }

  // ==========================================
  // SPLIT SLIDER (Öncesi / Sonrası Kaydırıcısı)
  // ==========================================
  setupSplitSlider() {
    const container = document.getElementById('comparison-container');
    const handle = document.getElementById('split-handle');

    const onMove = (clientX) => {
      if (!this.isDragging) return;
      const rect = container.getBoundingClientRect();
      let pos = (clientX - rect.left) / rect.width;
      pos = Math.max(0.01, Math.min(0.99, pos));
      this.splitPosition = pos;
      this.updateSplitView();
    };

    // Fare Olayları
    container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      onMove(e.clientX);
    });
    window.addEventListener('mousemove', (e) => onMove(e.clientX));
    window.addEventListener('mouseup', () => { this.isDragging = false; });

    // Dokunmatik (Mobil) Olayları
    container.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      if (e.touches.length > 0) onMove(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => { this.isDragging = false; });
  }

  updateSplitView() {
    const container = document.getElementById('comparison-container');
    const beforeWrapper = document.getElementById('before-wrapper');
    const handle = document.getElementById('split-handle');
    const originalImg = document.getElementById('original-image');
    const canvas = document.getElementById('sketch-canvas');

    const pct = this.splitPosition * 100;
    beforeWrapper.style.width = `${pct}%`;
    handle.style.left = `${pct}%`;

    // Orijinal görselin canvas ile tam hizalı kalmasını sağla
    if (canvas && originalImg) {
      const cWidth = canvas.clientWidth;
      originalImg.style.width = `${cWidth}px`;
    }
  }

  // ==========================================
  // "RESSAM ÇİZİYOR..." CANLI ANİMASYON SİMÜLASYONU
  // ==========================================
  playDrawingAnimation() {
    if (!this.currentImage) return;

    const overlay = document.getElementById('drawing-overlay');
    const bar = document.getElementById('drawing-bar');
    const status = document.getElementById('drawing-status');

    overlay.style.display = 'flex';
    bar.style.width = '0%';

    const steps = [
      { pct: 25, text: '1. Taslak hatları ve konturlar belirleniyor...', sound: 0.18 },
      { pct: 55, text: '2. Çapraz tarama darbeleri (hatching) atılıyor...', sound: 0.22 },
      { pct: 85, text: '3. Füzen ile gölgeler dağıtılıyor, kağıt dokusu işleniyor...', sound: 0.25 },
      { pct: 100, text: '4. Fatih PATIR imzası atılıyor ve eser tamamlandı!', sound: 0.3 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const s = steps[currentStep];
        bar.style.width = `${s.pct}%`;
        status.textContent = s.text;
        this.playPencilScratch(s.sound);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          overlay.style.display = 'none';
          this.renderSketch();
          this.playSuccessChime();
        }, 400);
      }
    }, 650);
  }

  // ==========================================
  // PRESETLER VE AYARLAR
  // ==========================================
  setPreset(style) {
    this.currentPreset = style;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`preset-${style}`);
    if (btn) btn.classList.add('active');

    // Presetlere özgü ideal ayarlar
    if (style === 'classic') {
      this.updateSliders(50, 50, 50, 50, 50);
    } else if (style === 'hatch') {
      this.updateSliders(65, 60, 85, 20, 40);
    } else if (style === 'charcoal') {
      this.updateSliders(80, 60, 45, 80, 60);
    } else if (style === 'sepia') {
      this.updateSliders(50, 45, 50, 55, 75);
    } else if (style === 'tinted') {
      this.updateSliders(45, 45, 40, 45, 35);
    }

    this.playPencilScratch(0.15);
    this.renderSketch();
  }

  updateSliders(h, sw, hi, sm, pt) {
    this.settings.hardness = h;
    this.settings.strokeWeight = sw;
    this.settings.hatchIntensity = hi;
    this.settings.smudgeAmount = sm;
    this.settings.paperTexture = pt;

    document.getElementById('slider-hardness').value = h;
    document.getElementById('val-hardness').textContent = `${h}%`;

    document.getElementById('slider-strokeWeight').value = sw;
    document.getElementById('val-strokeWeight').textContent = `${sw}%`;

    document.getElementById('slider-hatchIntensity').value = hi;
    document.getElementById('val-hatchIntensity').textContent = `${hi}%`;

    document.getElementById('slider-smudgeAmount').value = sm;
    document.getElementById('val-smudgeAmount').textContent = `${sm}%`;

    document.getElementById('slider-paperTexture').value = pt;
    document.getElementById('val-paperTexture').textContent = `${pt}%`;
  }

  onSliderChange(key, value) {
    this.settings[key] = parseInt(value, 10);
    document.getElementById(`val-${key}`).textContent = `${value}%`;
    this.playPencilScratch(0.06);

    // Canlı render (debounce)
    clearTimeout(this.renderTimeout);
    this.renderTimeout = setTimeout(() => {
      this.renderSketch();
    }, 80);
  }

  onSignatureToggle(checked) {
    this.settings.signature = checked;
    this.playPencilScratch(0.08);
    this.renderSketch();
  }

  resetSettings() {
    this.setPreset('classic');
  }

  // ==========================================
  // FOTOĞRAF İNDİRME (HD Export)
  // ==========================================
  downloadImage() {
    if (!this.currentImage) return;

    const canvas = document.getElementById('sketch-canvas');
    const link = document.createElement('a');
    link.download = `karakalem-fatih-patir-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    this.playSuccessChime();
  }

  // ==========================================
  // KAMERA YÖNETİMİ
  // ==========================================
  openCameraModal() {
    this.showModal('modal-camera');
    const video = document.getElementById('camera-stream');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.cameraFacing }
      }).then((stream) => {
        this.cameraStream = stream;
        video.srcObject = stream;
      }).catch((err) => {
        console.warn('Kamera erişim hatası:', err);
        alert('Kameraya erişilemedi veya izin verilmedi.');
        this.closeCameraModal();
      });
    } else {
      alert('Tarayıcınız kamera özelliğini desteklemiyor.');
      this.closeCameraModal();
    }
  }

  switchCameraFacing() {
    this.cameraFacing = (this.cameraFacing === 'environment') ? 'user' : 'environment';
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
    }
    this.openCameraModal();
  }

  captureFromCamera() {
    const video = document.getElementById('camera-stream');
    if (!video.videoWidth) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const img = new Image();
    img.onload = () => {
      this.displayImage(img);
      this.closeCameraModal();
    };
    img.src = tempCanvas.toDataURL('image/jpeg', 0.95);
  }

  closeCameraModal() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    this.hideModal('modal-camera');
  }

  // ==========================================
  // MODAL YÖNETİMİ
  // ==========================================
  showModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }

  hideModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    if (this.cameraStream) {
      this.closeCameraModal();
    }
  }

  // ==========================================
  // PWA KURULUM & SERVİCE WORKER
  // ==========================================
  setupPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Karakalem-SW aktif:', reg.scope))
          .catch(err => console.warn('Karakalem-SW hata:', err));
      });
    }

    const installBtn = document.getElementById('btn-install');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (installBtn) installBtn.style.display = 'inline-flex';
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      if (installBtn) installBtn.style.display = 'none';
      this.playSuccessChime();
    });
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWA Kurulumu onaylandı');
        }
        this.deferredPrompt = null;
        document.getElementById('btn-install').style.display = 'none';
      });
    }
  }
}

// Uygulamayı başlat
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new KarakalemApp();
});
