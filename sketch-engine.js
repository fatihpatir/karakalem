/**
 * GERÇEKÇİ RESİM ATÖLYESİ - KARAKALEM ÇİZİM MOTORU (Gelişmiş El Çizimi Sürümü)
 * Photoshop filtresi gibi düz/fotoğrafik durmasını engelleyen,
 * gerçek kurşun kalem eskiz çizgilerini, saç tellerini, kıyafet kıvrımlarını
 * ve el çizimi tarama darbelerini belirginleştiren özel algoritma.
 * 
 * Geliştirici: Fatih PATIR (https://fatihpatir.github.io/web)
 */

class SketchEngine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Çizim Fonksiyonu
   */
  process(srcImg, options = {}) {
    const {
      style = 'portrait',         // 'portrait', 'sketch', 'caricature'
      lineIntensity = 65,         // 0 - 100 (Kalem Çizgisi Miktarı / Vurgusu)
      shadingDepth = 55,          // 0 - 100 (Gölge ve Tarama Yoğunluğu)
      paperWhiteness = 75,        // 0 - 100 (Arka Plan Beyazlığı)
      signature = true,
      maxDimension = 1800
    } = options;

    let w = srcImg.naturalWidth || srcImg.width;
    let h = srcImg.naturalHeight || srcImg.height;

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

    // 1. ADIM: Parlaklık ve Gri Tonlama (Luminance)
    const gray = new Float32Array(len);
    let minG = 255, maxG = 0;

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const val = 0.299 * pix[idx] + 0.587 * pix[idx + 1] + 0.114 * pix[idx + 2];
      gray[i] = val;
      if (val < minG) minG = val;
      if (val > maxG) maxG = val;
    }

    // Kontrast Gerdirme (Auto-Levels)
    const gRange = Math.max(1, maxG - minG);
    for (let i = 0; i < len; i++) {
      gray[i] = ((gray[i] - minG) / gRange) * 255;
    }

    // 2. ADIM: ÇOK KATMANLI KURŞUN KALEM ESKİZ ÇİZGİLERİ (Pencil Sketch Lines)
    // Fotoğraf gibi durmaması için 3 farklı ölçekte el çizgisi çıkarıyoruz:
    // A) Ana Hatlar (Göz, kaş, dudak, çene, silüet)
    // B) İnce Detay Çizgileri (Saç telleri, göz kapağı, burun gölgesi, kumaş kıvrımları)
    // C) Yüksek Frekanslı Grafit Çizgi Dokusu (Serbest el eskiz etkisi)
    const blur1 = this.boxBlur(gray, w, h, 1);
    const blur2 = this.boxBlur(gray, w, h, 2);
    const blur4 = this.boxBlur(gray, w, h, 4);

    const lineWeight = lineIntensity / 100; // 0.0 - 1.0
    const sketchLines = new Float32Array(len);

    for (let i = 0; i < len; i++) {
      // 1. Ana Kontur (Kalın 4B kalem)
      const diffMain = blur1[i] - blur4[i];
      let lineVal = 1.0;
      if (diffMain < -1.5) {
        const str = Math.min(1.0, Math.abs(diffMain) / 16.0) * (0.8 + lineWeight * 0.6);
        lineVal -= str;
      }

      // 2. İnce Detay ve Saç Telleri (2B kalem)
      const diffFine = gray[i] - blur2[i];
      if (diffFine < -2.0) {
        const fineStr = Math.min(1.0, Math.abs(diffFine) / 18.0) * (0.4 + lineWeight * 0.7);
        lineVal -= fineStr * 0.75;
      }

      // 3. Yüksek Frekans Çizgi Vurgusu (Eskiz hissi veren kırçıllar)
      const laplace = Math.abs(gray[i] - blur1[i]);
      if (laplace > 4.0 && gray[i] < 210) {
        const hatchStr = (laplace / 40.0) * (lineWeight * 0.4);
        lineVal -= hatchStr;
      }

      sketchLines[i] = Math.min(1.0, Math.max(0.0, lineVal));
    }

    // 3. ADIM: YÜZEY VE TEN TONLAMASI (Yumuşak Füzen)
    // Teni pürüzsüzleştir ama çizgileri bozma
    const smoothSkin = this.surfaceBlur(gray, w, h, 3, 30);

    // 4. ADIM: GÖLGE ALANLARINA DOĞAL KALEM TARAMA DARBELERİ (Pencil Hatching)
    // Koyu bölgelere (saç, ceket, gölgeler) ressamın kalemi sürttüğü çizgiler eklenir
    const hatchStep = Math.max(2, Math.round(w / 380));
    const hatchStrength = (shadingDepth / 100);

    const bgCutoff = 255 - (paperWhiteness / 100) * 115;
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    const outImg = this.ctx.createImageData(w, h);
    const outPix = outImg.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const idx = i * 4;

        // Merkezden kenarlara doğru hafif beyaz kağıda geçiş (vignette)
        const dx = x - cx;
        const dy = y - cy;
        const distRatio = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const edgeFade = Math.min(1.0, distRatio * 1.15);

        // Çizgi değeri
        const line = sketchLines[i];
        let tone = smoothSkin[i] / 255.0; // 0 = siyah, 1 = beyaz

        // Arka planı uçur (bembeyaz kağıt yap)
        if (smoothSkin[i] > bgCutoff) {
          const t = (smoothSkin[i] - bgCutoff) / (255 - bgCutoff);
          tone = tone * (1 - t) + 1.0 * t;
        }

        if (edgeFade > 0.65) {
          const fadeFactor = (edgeFade - 0.65) / 0.35;
          tone = tone * (1 - fadeFactor) + 1.0 * fadeFactor;
        }

        // Gölgelerde elle çizilmiş gibi doğal tarama çizgileri
        let strokeHatch = 1.0;
        if (hatchStrength > 0.2 && tone < 0.70) {
          // Açılı kurşun kalem vuruşları (45 derece)
          const p1 = (x + y) % (hatchStep * 3);
          if (p1 < hatchStep && tone < 0.55) {
            strokeHatch *= (0.75 + tone * 0.25);
          }
          // Çapraz tarama (135 derece - sadece çok koyu yerlerde)
          const p2 = (x - y + 10000) % (hatchStep * 3);
          if (p2 < hatchStep && tone < 0.35) {
            strokeHatch *= (0.7 + tone * 0.3);
          }
          // Etkiyi orantıla
          strokeHatch = 1.0 - (1.0 - strokeHatch) * hatchStrength;
        }

        // Karakalem birleşimi:
        // [Çizgi Konturları] * [Gölge Tonlaması] * [Kalem Taraması]
        let pencil = line * (0.35 + tone * 0.65) * strokeHatch;

        // Modlara göre ayar
        if (style === 'sketch') {
          // Sanatçı Eskizi: Çizgiler daha baskın ve canlı
          pencil = Math.min(pencil, line * 0.92);
        } else if (style === 'caricature') {
          // Karikatür: Kalınlaştırılmış ve yüksek kontrast
          pencil = Math.pow(pencil, 1.35);
          if (line < 0.75) pencil *= 0.5;
        } else {
          // Hediyelik Portre (1. ve 3. resim):
          // Konturlar net, gölgeler ipeksi
          if (line < 0.85) {
            pencil = Math.min(pencil, line * (0.8 + lineWeight * 0.2));
          }
        }

        // Gerçek Kağıt Greni (Kurşun kalemin pütürlü kağıda sürtünmesi)
        const paperTooth = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 0.05;
        pencil = Math.min(1.0, Math.max(0.0, pencil + paperTooth));

        // Kurşun Kalem Grafit Rengi (Koyu füzen grisi)
        const grayVal = Math.round(pencil * 255);

        outPix[idx] = grayVal;
        outPix[idx + 1] = grayVal;
        outPix[idx + 2] = Math.min(255, grayVal + 2); // Doğal grafit parlaklığı
        outPix[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(outImg, 0, 0);

    // 5. ADIM: Sanatçı İmzası (Fatih PATIR)
    if (signature) {
      this.drawSignature(w, h);
    }

    return this.canvas;
  }

  drawSignature(w, h) {
    const ctx = this.ctx;
    const fontSize = Math.max(16, Math.round(w * 0.024));
    ctx.save();
    ctx.font = `italic 700 ${fontSize}px "Caveat", "Brush Script MT", cursive, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(30, 30, 35, 0.75)';
    ctx.fillText('Fatih PATIR', w - (w * 0.04), h - (h * 0.035));
    ctx.restore();
  }

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
        let count = 0;

        for (let ny = yMin; ny <= yMax; ny++) {
          const rowOffset = ny * w;
          for (let nx = xMin; nx <= xMax; nx++) {
            const val = src[rowOffset + nx];
            const diff = val - centerVal;
            if (diff * diff < threshSq) {
              sum += val;
              count++;
            }
          }
        }
        dest[y * w + x] = (count > 0) ? (sum / count) : centerVal;
      }
    }
    return dest;
  }

  boxBlur(src, w, h, radius) {
    const temp = new Float32Array(w * h);
    const dest = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      const offset = y * w;
      for (let x = 0; x < w; x++) {
        let sum = 0, count = 0;
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

    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sum = 0, count = 0;
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
