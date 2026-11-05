/**
 * KARAKALEM ÇİZİM MOTORU (Realistic Graphite Sketch Engine)
 * XDoG (Extended Difference of Gaussians), Çapraz Tarama (Cross-Hatching),
 * Füzen Dağıtma (Smudge) ve Canson Kağıt Dokusu Sentezleyici.
 * Geliştirici: Fatih PATIR (https://fatihpatir.github.io/web)
 */

class SketchEngine {
  constructor() {
    this.offCanvas = document.createElement('canvas');
    this.offCtx = this.offCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Ana dönüştürme fonksiyonu
   * @param {HTMLImageElement|HTMLCanvasElement} sourceImg 
   * @param {Object} options 
   * @returns {HTMLCanvasElement}
   */
  process(sourceImg, options = {}) {
    const {
      style = 'classic',        // 'classic', 'hatch', 'charcoal', 'sepia', 'tinted'
      hardness = 50,            // 0 - 100 (Kalem Sertliği / Kontrast)
      strokeWeight = 50,        // 0 - 100 (Çizgi Kalınlığı)
      hatchIntensity = 50,      // 0 - 100 (Tarama Yoğunluğu)
      smudgeAmount = 50,        // 0 - 100 (Gölge Dağıtma)
      paperTexture = 50,        // 0 - 100 (Kağıt Greni)
      signature = true,         // Fatih PATIR imzası
      maxDimension = 1920       // Performans ve kalite için maks boyut
    } = options;

    let w = sourceImg.naturalWidth || sourceImg.width;
    let h = sourceImg.naturalHeight || sourceImg.height;

    // Boyutlandırma (Gerekirse en boy oranını koruyarak küçült)
    if (w > maxDimension || h > maxDimension) {
      if (w > h) {
        h = Math.round((h * maxDimension) / w);
        w = maxDimension;
      } else {
        w = Math.round((w * maxDimension) / h);
        h = maxDimension;
      }
    }

    this.offCanvas.width = w;
    this.offCanvas.height = h;
    this.offCtx.drawImage(sourceImg, 0, 0, w, h);

    const imgData = this.offCtx.getImageData(0, 0, w, h);
    const pixels = imgData.data;
    const len = w * h;

    // 1. ADIM: Parlaklık Haritası ve Otomatik Kontrast (Luminance)
    const lum = new Float32Array(len);
    let minLum = 255, maxLum = 0;

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const l = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      lum[i] = l;
      if (l < minLum) minLum = l;
      if (l > maxLum) maxLum = l;
    }

    // Kontrast Gerdirme (Auto-Levels)
    const range = Math.max(1, maxLum - minLum);
    for (let i = 0; i < len; i++) {
      lum[i] = Math.min(255, Math.max(0, ((lum[i] - minLum) / range) * 255));
    }

    // 2. ADIM: XDoG Çok Ölçekli Kenar ve Hat Çıkarma (Pencil Contours)
    const sigma1 = 0.6 + (strokeWeight / 100) * 1.4;
    const sigma2 = sigma1 * 1.6;
    const blur1 = this.gaussianBlur(lum, w, h, sigma1);
    const blur2 = this.gaussianBlur(lum, w, h, sigma2);

    const gamma = 0.95;
    const phi = 10 + (hardness / 100) * 20; // Eşik dikliği
    const epsilon = -0.05 + (hardness / 100) * 0.12;

    const edges = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const u = blur1[i] - gamma * blur2[i];
      if (u >= epsilon) {
        edges[i] = 1.0;
      } else {
        edges[i] = 1.0 + Math.tanh(phi * (u - epsilon));
      }
    }

    // 3. ADIM: Çapraz Tarama ve Gölgelendirme Deseni (Hatching Simulation)
    const hatchScale = Math.max(2, Math.round(w / 350));
    const hatchWeight = (hatchIntensity / 100);
    const hatchLayer = new Float32Array(len);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const brightness = lum[i] / 255; // 0 (karanlık) - 1 (aydınlık)
        let strokeVal = 1.0;

        if (hatchWeight > 0.05) {
          // 45 derece tarama (Orta tonlar)
          const p1 = (x + y) % (hatchScale * 4);
          const isLine1 = (p1 < hatchScale * 1.2);

          // 135 derece çapraz tarama (Koyu tonlar)
          const p2 = (x - y + 10000) % (hatchScale * 4);
          const isLine2 = (p2 < hatchScale * 1.2);

          // Dikey tarama (Derin gölgeler)
          const p3 = x % (hatchScale * 4);
          const isLine3 = (p3 < hatchScale * 1.2);

          if (brightness < 0.75 && isLine1) {
            strokeVal *= (0.4 + brightness * 0.6);
          }
          if (brightness < 0.45 && isLine2) {
            strokeVal *= (0.3 + brightness * 0.7);
          }
          if (brightness < 0.22 && isLine3) {
            strokeVal *= 0.35;
          }

          // Tarama ağırlığını ayarla
          strokeVal = 1.0 - (1.0 - strokeVal) * hatchWeight;
        }

        hatchLayer[i] = strokeVal;
      }
    }

    // 4. ADIM: Füzen & Gölge Dağıtma Katmanı (Smudge / Tortillon)
    const smudgeSigma = 2.0 + (smudgeAmount / 100) * 6.0;
    const smudgedLum = this.gaussianBlur(lum, w, h, smudgeSigma);

    // 5. ADIM: Canson Kağıt Greni ve Doku Üretimi (Paper Texture)
    const grainFactor = (paperTexture / 100) * 0.22;
    const grain = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      // Mikro sürtünme pürüzü
      const noise = ((Math.sin(i * 12.9898 + (i % w) * 78.233) * 43758.5453) % 1);
      grain[i] = 1.0 - Math.abs(noise) * grainFactor;
    }

    // 6. ADIM: Katmanları Birleştirme ve Sanatçı Stilleri (Compositing)
    const output = this.offCtx.createImageData(w, h);
    const outPix = output.data;

    // Renk tonları
    const isSepia = (style === 'sepia');
    const isTinted = (style === 'tinted');
    const isCharcoal = (style === 'charcoal');

    for (let i = 0; i < len; i++) {
      const idx = i * 4;

      // Temel ton birleşimi:
      // Edge (XDoG) * Hatching * (Smudged Shadow) * Paper Grain
      const edgeVal = edges[i];
      const hatchVal = hatchLayer[i];
      const smudgeVal = (smudgedLum[i] / 255);
      const grainVal = grain[i];

      // Kurşun Kalem Değeri (0 = Koyu Grafit, 1 = Beyaz Kağıt)
      let graphite = edgeVal * hatchVal * (0.35 + smudgeVal * 0.65) * grainVal;

      if (isCharcoal) {
        // Kömür kalem stili: daha koyu ve yüksek kontrast
        graphite = Math.pow(graphite, 1.4);
        if (graphite < 0.45) graphite *= 0.65;
      }

      graphite = Math.min(1.0, Math.max(0.0, graphite));
      const val255 = graphite * 255;

      if (isTinted) {
        // Hafif suluboya renkli karakalem
        const origR = pixels[idx];
        const origG = pixels[idx + 1];
        const origB = pixels[idx + 2];
        const tintStrength = 0.42;

        outPix[idx] = Math.round(val255 * (1 - tintStrength) + (origR * graphite) * tintStrength);
        outPix[idx + 1] = Math.round(val255 * (1 - tintStrength) + (origG * graphite) * tintStrength);
        outPix[idx + 2] = Math.round(val255 * (1 - tintStrength) + (origB * graphite) * tintStrength);
      } else if (isSepia) {
        // Antik Parşömen Sepya Tonu
        outPix[idx] = Math.min(255, Math.round(val255 * 1.05 + 18));      // R
        outPix[idx + 1] = Math.min(255, Math.round(val255 * 0.92 + 10));  // G
        outPix[idx + 2] = Math.min(255, Math.round(val255 * 0.78 + 4));   // B
      } else {
        // Doğal Kurşun Kalem Grafit Tonu (Hafif soğuk siyah)
        const rVal = Math.round(val255 * 0.98);
        const gVal = Math.round(val255 * 0.98);
        const bVal = Math.round(val255 * 1.0);
        outPix[idx] = rVal;
        outPix[idx + 1] = gVal;
        outPix[idx + 2] = bVal;
      }

      outPix[idx + 3] = 255; // Opaklık
    }

    this.offCtx.putImageData(output, 0, 0);

    // 7. ADIM: İsteğe Bağlı Sanatçı İmzası (Fatih PATIR)
    if (signature) {
      this.drawArtistSignature(w, h, isSepia);
    }

    return this.offCanvas;
  }

  /**
   * Sağ alt köşeye kurşun kalemle atılmış gibi doğal imza
   */
  drawArtistSignature(w, h, isSepia = false) {
    const ctx = this.offCtx;
    const fontSize = Math.max(14, Math.round(w * 0.022));
    ctx.save();
    ctx.font = `italic 600 ${fontSize}px "Caveat", "Brush Script MT", cursive, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = isSepia ? 'rgba(92, 64, 40, 0.75)' : 'rgba(40, 40, 45, 0.72)';
    ctx.fillText('Fatih PATIR', w - (w * 0.04), h - (h * 0.03));
    ctx.restore();
  }

  /**
   * Hızlı 1D Ayrılabilir Gauss Bulanıklaştırma (Fast Separable Gaussian Blur)
   */
  gaussianBlur(src, w, h, sigma) {
    const radius = Math.ceil(sigma * 2.5);
    const kernelSize = radius * 2 + 1;
    const kernel = new Float32Array(kernelSize);
    let sum = 0;

    for (let i = 0; i < kernelSize; i++) {
      const x = i - radius;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }
    for (let i = 0; i < kernelSize; i++) kernel[i] /= sum;

    const temp = new Float32Array(w * h);
    const dest = new Float32Array(w * h);

    // Yatay Geçiş
    for (let y = 0; y < h; y++) {
      const yOffset = y * w;
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
          const px = Math.min(w - 1, Math.max(0, x + k));
          acc += src[yOffset + px] * kernel[k + radius];
        }
        temp[yOffset + x] = acc;
      }
    }

    // Dikey Geçiş
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
          const py = Math.min(h - 1, Math.max(0, y + k));
          acc += temp[py * w + x] * kernel[k + radius];
        }
        dest[y * w + x] = acc;
      }
    }

    return dest;
  }
}

// Global olarak dışa aktar
window.SketchEngine = SketchEngine;
