/**
 * ÖRNEK GÖRSEL ÜRETİCİ (Sample Image Generator)
 * İnternet bağlantısı olmasa bile tek tıkla Manzara, Araba, İnsan ve Hayvan
 * fotoğraflarını test etmek için yüksek kaliteli dahili test tuvali.
 */

const SampleImages = {
  createSample(type = 'portrait') {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    if (type === 'portrait') {
      // 1. İNSAN / PORTRE ÖRNEĞİ
      const grad = ctx.createLinearGradient(0, 0, 0, 800);
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(1, '#ea580c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 800);

      // Yüz ve Boyun
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(400, 380, 160, 210, 0, 0, Math.PI * 2);
      ctx.fill();

      // Saçlar
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(400, 300, 180, Math.PI, 0);
      ctx.bezierCurveTo(580, 480, 500, 600, 470, 620);
      ctx.bezierCurveTo(400, 450, 400, 450, 330, 620);
      ctx.bezierCurveTo(300, 600, 220, 480, 220, 300);
      ctx.fill();

      // Gözler
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(340, 370, 28, 16, -0.1, 0, Math.PI * 2);
      ctx.ellipse(460, 370, 28, 16, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(340, 370, 14, 0, Math.PI * 2);
      ctx.arc(460, 370, 14, 0, Math.PI * 2);
      ctx.fill();

      // Burun ve Dudak
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(400, 370);
      ctx.lineTo(395, 430);
      ctx.lineTo(410, 435);
      ctx.stroke();

      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.ellipse(400, 480, 40, 16, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (type === 'car') {
      // 2. ARABA / ARAÇ ÖRNEĞİ
      const grad = ctx.createLinearGradient(0, 0, 0, 800);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.6, '#38bdf8');
      grad.addColorStop(0.61, '#334155');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 800);

      // Araba Gövdesi
      ctx.fillStyle = '#dc2626'; // Kırmızı spor araba
      ctx.beginPath();
      ctx.moveTo(100, 520);
      ctx.lineTo(160, 440);
      ctx.lineTo(260, 390);
      ctx.lineTo(520, 390);
      ctx.lineTo(660, 450);
      ctx.lineTo(730, 490);
      ctx.lineTo(740, 550);
      ctx.lineTo(90, 550);
      ctx.closePath();
      ctx.fill();

      // Camlar
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(270, 405);
      ctx.lineTo(380, 405);
      ctx.lineTo(380, 455);
      ctx.lineTo(190, 455);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(400, 405);
      ctx.lineTo(510, 405);
      ctx.lineTo(620, 455);
      ctx.lineTo(400, 455);
      ctx.closePath();
      ctx.fill();

      // Tekerlekler
      const drawWheel = (x, y) => {
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(x, y, 65, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(x, y, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
      };
      drawWheel(220, 550);
      drawWheel(610, 550);

    } else if (type === 'landscape') {
      // 3. MANZARA / DOĞA ÖRNEĞİ
      const grad = ctx.createLinearGradient(0, 0, 0, 800);
      grad.addColorStop(0, '#f43f5e');
      grad.addColorStop(0.4, '#fb923c');
      grad.addColorStop(0.7, '#fef08a');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 800);

      // Güneş
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(400, 320, 90, 0, Math.PI * 2);
      ctx.fill();

      // Dağlar
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, 600);
      ctx.lineTo(240, 320);
      ctx.lineTo(480, 600);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(320, 600);
      ctx.lineTo(560, 260);
      ctx.lineTo(800, 600);
      ctx.fill();

      // Göl / Nehir
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, 580, 800, 220);

      // Çam Ağaçları
      const drawTree = (x, y) => {
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 30, y + 60);
        ctx.lineTo(x + 30, y + 60);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y + 40);
        ctx.lineTo(x - 45, y + 110);
        ctx.lineTo(x + 45, y + 110);
        ctx.fill();
      };
      drawTree(120, 510);
      drawTree(680, 500);

    } else if (type === 'animal') {
      // 4. HAYVAN / KEDİ ÖRNEĞİ
      const grad = ctx.createLinearGradient(0, 0, 800, 800);
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(1, '#047857');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 800);

      // Kedi Başı
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(400, 440, 170, 0, Math.PI * 2);
      ctx.fill();

      // Kulaklar
      ctx.beginPath();
      ctx.moveTo(270, 340);
      ctx.lineTo(250, 180);
      ctx.lineTo(360, 280);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(530, 340);
      ctx.lineTo(550, 180);
      ctx.lineTo(440, 280);
      ctx.fill();

      // Gözler
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(330, 410, 32, 22, -0.1, 0, Math.PI * 2);
      ctx.ellipse(470, 410, 32, 22, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(330, 410, 10, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(470, 410, 10, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Burun ve Bıyıklar
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(400, 480);
      ctx.lineTo(385, 465);
      ctx.lineTo(415, 465);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      // Bıyıklar
      ctx.beginPath();
      ctx.moveTo(370, 480); ctx.lineTo(210, 460);
      ctx.moveTo(370, 490); ctx.lineTo(200, 495);
      ctx.moveTo(370, 500); ctx.lineTo(220, 530);
      ctx.moveTo(430, 480); ctx.lineTo(590, 460);
      ctx.moveTo(430, 490); ctx.lineTo(600, 495);
      ctx.moveTo(430, 500); ctx.lineTo(580, 530);
      ctx.stroke();
    }

    const img = new Image();
    img.src = canvas.toDataURL('image/jpeg', 0.95);
    return img;
  }
};

window.SampleImages = SampleImages;
