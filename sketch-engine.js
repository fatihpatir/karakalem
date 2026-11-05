/**
 * GERÇEKÇİ RESİM ATÖLYESİ KARAKALEM MOTORU (Realistic Portrait Pencil Engine)
 * Yüklenen görselleri 1. ve 3. örnekteki gibi:
 * - Arka planı temiz beyaz kağıda çeken,
 * - Yüz ve teni pürüzsüzleştirip lekesiz bırakan,
 * - Göz, kaş, dudak ve saç tellerini koyu kurşun kalemle (4B/6B) belirginleştiren,
 * - Yumuşak füzen gölgeleriyle derinlik katan profesyonel algoritma.
 * 
 * Geliştirici: Fatih PATIR (https://fatihpatir.github.io/web)
 */

class SketchEngine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Ana Çizim Fonksiyonu
   * @param {HTMLImageElement|HTMLCanvasElement} srcImg 
   * @param {Object} options 
   * @returns {HTMLCanvasElement}
   */
  process(srcImg, options = {}) {
    const {
      style = 'portrait',       // 'portrait' (Hediyelik Portre), 'sketch' (Sanatçı Eskizi), 'caricature' (Karikatür)
      toneDepth = 50,           // 0 - 100 Gölgelendirme Derinliği
      lineDarkness = 60,        // 0 - 100 Kalem Koyuluğu
      paperWhiteness = 75,      // 0 - 100 Arka Plan Beyazlığı
      signature = true,         // Fatih PATIR imzası
      maxDimension = 1800
    } = options;

    let w = srcImg.naturalWidth || srcImg.width;
    let h = srcImg.naturalHeight || srcImg.height;

    // En boy oranını koruyarak optimize et
    if (w > maxDimension || h > maxDimension) {
      if (w > h) {
        h = Math.round((h * maxDimension) / w);
        w = maxDimension;
      } else {
        w = Math.round((w * maxDimension) / h);
        h = maxDimension;
      }
    }

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(srcImg, 0, 0, w, h);

    const imgData = this.ctx.getImageData(0, 0, w, h);
    const pix = imgData.data;
    const len = w * h;

    // 1. ADIM: İnsan Gözüne Uygun Gri Tonlama & Parlaklık Analizi
    const gray = new Float32Array(len);
    let minG = 255, maxG = 0;

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      // Perceptual Luminance
      const val = 0.299 * pix[idx] + 0.587 * pix[idx + 1] + 0.114 * pix[idx + 2];
      gray[i] = val;
      if (val < minG) minG = val;
      if (val > maxG) maxG = val;
    }

    // Dinamik Kontrast Gerdirme (Auto-Levels)
    const gRange = Math.max(1, maxG - minG);
    for (let i = 0; i < len; i++) {
      gray[i] = ((gray[i] - minG) / gRange) * 255;
    }

    // 2. ADIM: Cilt Pürüzsüzleştirme (Bilateral / Yüzey Filtresi)
    // Bu sayede yanaklar, alın ve ten tertemiz kalır; gereksiz kumlanma ve leke oluşmaz!
    const smoothRadius = (style === 'portrait') ? 3 : 2;
    const smoothSkin = this.surfaceBlur(gray, w, h, smoothRadius, 35);

    // 3. ADIM: İnce Kurşun Kalem Konturları (Gözler, Dudaklar, Kaşlar, Saçlar)
    // Geniş ve dar Gauss farkı ile hatları yakalama (XDoG)
    const blurNarrow = this.boxBlur(gray, w, h, 1);
    const blurWide = this.boxBlur(gray, w, h, (style === 'caricature') ? 4 : 2);

    const edges = new Float32Array(len);
    const darkFactor = 0.5 + (lineDarkness / 100) * 0.9;

    for (let i = 0; i < len; i++) {
      // Kenar yoğunluğu
      const diff = blurNarrow[i] - blurWide[i];
      if (diff < -1) {
        // Koyu kontur çizgisi (Göz bebeği, kirpik, saç telleri, dudak kıvrımları)
        const intensity = Math.min(1.0, Math.abs(diff) / 18.0) * darkFactor;
        edges[i] = 1.0 - intensity;
      } else {
        edges[i] = 1.0;
      }
    }

    // 4. ADIM: Arka Planı Temizleme & Beyaz Kağıt Yalıtımı (High-Key Paper Isolation)
    // Açık tonları bembeyaz sanat kağıdına çek, sadece gölgeleri koru
    const bgCutoff = 255 - (paperWhiteness / 100) * 110; // Eşik değeri

    // Merkez Ağırlıklı Mercek (Vignette) - Kenarlara doğru hafif beyazlama
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    // 5. ADIM: Çizim Katmanlarını Birleştirme
    const outImg = this.ctx.createImageData(w, h);
    const outPix = outImg.data;
    const depthWeight = (toneDepth / 100);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const idx = i * 4;

        // Merkezden uzaklık (hafif sanatsal kenar solması)
        const dx = x - cx;
        const dy = y - cy;
        const distRatio = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const edgeFade = Math.min(1.0, distRatio * 1.1);

        const edgeVal = edges[i]; // 0 (koyu hat) .. 1 (beyaz)
        let toneVal = smoothSkin[i] / 255.0; // 0 (gölge) .. 1 (ışık)

        // Arka planı uçurma ve teni aydınlatma
        if (smoothSkin[i] > bgCutoff) {
          const t = (smoothSkin[i] - bgCutoff) / (255 - bgCutoff);
          toneVal = toneVal * (1 - t) + 1.0 * t; // Beyaza doğru aç
        }

        // Kenarlara doğru fırça hafiflemesi (vignette)
        if (edgeFade > 0.65) {
          const fadeFactor = (edgeFade - 0.65) / 0.35;
          toneVal = toneVal * (1 - fadeFactor) + 1.0 * fadeFactor;
        }

        // Gölgelendirme derinliği
        const shadow = 1.0 - (1.0 - toneVal) * (0.45 + depthWeight * 0.55);

        // Nihai Kurşun Kalem Değeri: Kontur Çizgisi * Yumuşak Gölge
        let pencil = edgeVal * shadow;

        if (style === 'caricature') {
          // Karikatür modu: Çizgiler daha kalın ve kontrastlı
          pencil = Math.pow(pencil, 1.3);
          if (edgeVal < 0.8) pencil *= 0.6; // Konturları iyice belirginleştir
        } else if (style === 'sketch') {
          // Sanatçı Eskizi modu: Saç ve hatlar daha keskin
          if (edgeVal < 0.9) pencil = Math.min(pencil, edgeVal * 0.95);
        }

        // Doğal Resim Kağıdı Dokusu (Hafif granül)
        const paperNoise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 0.04;
        pencil = Math.min(1.0, Math.max(0.0, pencil + paperNoise));

        // Kurşun Kalem Grafit Rengi (Koyu grafit grisi: #1f2024 ile beyaz kağıt arası)
        const graphiteGray = Math.round(pencil * 255);
        
        // Çok hafif sıcak/soğuk kurşun kalem ton dengesi
        outPix[idx] = graphiteGray;         // R
        outPix[idx + 1] = graphiteGray;     // G
        outPix[idx + 2] = Math.min(255, graphiteGray + 1); // B (hafif grafit maviliği)
        outPix[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(outImg, 0, 0);

    // 6. ADIM: İsteğe Bağlı Sanatçı İmzası
    if (signature) {
      this.drawSignature(w, h);
    }

    return this.canvas;
  }

  /**
   * Sağ alt köşeye kurşun kalemle atılmış zarif sanatçı imzası
   */
  drawSignature(w, h) {
    const ctx = this.ctx;
    const fontSize = Math.max(16, Math.round(w * 0.024));
    ctx.save();
    ctx.font = `italic 700 ${fontSize}px "Caveat", "Brush Script MT", cursive, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(35, 35, 40, 0.75)';
    ctx.fillText('Fatih PATIR', w - (w * 0.04), h - (h * 0.035));
    ctx.restore();
  }

  /**
   * Hızlı Yüzey Bulanıklaştırma (Bilateral / Edge-Preserving Surface Blur)
   * Cildi pürüzsüzleştirirken göz, burun, dudak gibi keskin sınırları korur.
   */
  surfaceBlur(src, w, h, radius, threshold) {
    const dest = new Float32Array(w * h);
    const threshSq = threshold * threshold;

    for (let y = 0; y < h; y++) {
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(h - 1, y + radius);

      for (let x = 0; x < w; x++) {
        const xMin = Math.max(0, x - radius);
        const xMax = Math.min(w - 1, x + radius);

        const centerVal = src[y * w + x];
        let sum = 0;
        let weightSum = 0;

        for (let ny = yMin; ny <= yMax; ny++) {
          const rowOffset = ny * w;
          for (let nx = xMin; nx <= xMax; nx++) {
            const val = src[rowOffset + nx];
            const diff = val - centerVal;
            // Sadece benzer renkteki komşuları bulanıklaştır (kenarları bozma)
            if (diff * diff < threshSq) {
              sum += val;
              weightSum += 1;
            }
          }
        }

        dest[y * w + x] = (weightSum > 0) ? (sum / weightSum) : centerVal;
      }
    }
    return dest;
  }

  /**
   * Hızlı Kutu Bulanıklaştırma (Fast Box Blur)
   */
  boxBlur(src, w, h, radius) {
    const temp = new Float32Array(w * h);
    const dest = new Float32Array(w * h);

    // Yatay
    for (let y = 0; y < h; y++) {
      const offset = y * w;
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const px = x + k;
          if (px >= 0 && px < w) {
            sum += src[offset + px];
            count++;
          }
        }
        temp[offset + x] = sum / count;
      }
    }

    // Dikey
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sum = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const py = y + k;
          if (py >= 0 && py < h) {
            sum += temp[py * w + x];
            count++;
          }
        }
        dest[y * w + x] = sum / count;
      }
    }

    return dest;
  }
}

window.SketchEngine = SketchEngine;
