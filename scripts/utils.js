// ==========================
// 📦 Constantes generales
// ==========================
const { jsPDF } = window.jspdf;
const typeImage = "jpeg"; // Puedes cambiarlo a "png" si lo deseas

// ==========================
// 📏 Utilidades
// ==========================
function pxToMm(px, ppi = 96) {
  return (px / ppi) * 25.4;
}

function timeToArray(duration, lap = 5, start = 0) {
  const times = [];
  for (let t = start; t < duration; t += lap) times.push(t);
  return times;
}

function getVideoFileName(fileName) {
  return fileName.split('.').slice(0, -1).join('.');
}

function loadImageAsDataURL(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL(`image/${typeImage}`));
    };
    img.src = url;
  });
}

// ==========================
// 🖨️ Generador de PDF
// ==========================
async function generatePDF(images, { name = "capturas_video", width, height }) {
  if (!images?.length) throw new Error("No hay imágenes para generar PDF");

  const orientation = width > height ? "landscape" : "portrait";
  const pageWidth = pxToMm(width);
  const pageHeight = pxToMm(height);

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWidth, pageHeight],
    hotfixes: ["px_scaling"] // Mejor manejo de imágenes
  });

  for (let i = 0; i < images.length; i++) {
    if (i > 0) pdf.addPage([pageWidth, pageHeight], orientation);
    
    pdf.addImage(images[i], typeImage.toUpperCase(), 0, 0, pageWidth, pageHeight, 
      undefined, 'FAST'); // Modo rápido para muchas imágenes
    
    // Texto más legible
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(`Página ${i + 1}`, pageWidth - 30, pageHeight - 10);
  }

  pdf.save(`${name}-converted-to-PDF.pdf`);
}
// ==========================
// 🖨️ Generador de Gif
// ==========================

async function generateGIF(images, {baseName = "capturas_video", delay = 500, compression = 100}) {
  return new Promise((resolve) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      workerScript: 'gif.worker.js'
    });

    let loadedImages = 0;
    let hasError = false;
    let targetWidth, targetHeight;

    images.forEach((imgData) => {
      const img = new Image();
      img.onload = () => {
        if (!hasError) {
          // Calcular dimensiones comprimidas
          if (compression < 100) {
            const scale = compression / 100;
            targetWidth = Math.round(img.width * scale);
            targetHeight = Math.round(img.height * scale);
          } else {
            targetWidth = img.width;
            targetHeight = img.height;
          }

          // Crear canvas para redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          
          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Establecer dimensiones del GIF con la primera imagen
          if (loadedImages === 0) {
            gif.options.width = targetWidth;
            gif.options.height = targetHeight;
          }

          // Agregar frame comprimido
          gif.addFrame(canvas, { 
            delay: delay, 
            copy: true,
            width: targetWidth,
            height: targetHeight
          });

          loadedImages++;

          if (loadedImages === images.length) {
            gif.render();
          }
        }
      };

      img.onerror = () => {
        console.error("Error al cargar imagen para GIF");
        hasError = true;
      };

      img.src = imgData;
    });

    gif.on('finished', function (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    });

    gif.on('abort', function () {
      console.error("Generación de GIF abortada");
      resolve();
    });
  });
}

// ==========================
// 🖨️ Generador de ZIP
// ==========================
async function downloadAsZip(images, { baseName = "capturas", startTime = 0, lapTime }) {
  if (!images?.length) throw new Error("No hay imágenes para comprimir");
  const zip = new JSZip();
  images.forEach((imgData, index) => {
    const base64Data = imgData.split(',')[1];
    const time = `_time-${startTime + lapTime * index}s` || "";
    zip.file(`img_${baseName}${time}_${index + 1}.jpg`, base64Data, { base64: true });
  });

  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = `${baseName}.zip`;
  a.click();
}

// ==========================
// 🖨️ Generador de WebP
// ==========================

async function generateWebP(images, name = "capturas_video") {
  return new Promise((resolve) => {
    const encoder = new Whammy.Video(); // ❌ sin FPS

    let loaded = 0;

    images.forEach((imgData) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

        // ✅ Duración manual: 1000 ms por frame
        encoder.add(canvas, 1000);

        loaded++;

        if (loaded === images.length) {
          encoder.compile(false, (webm) => {
            const url = URL.createObjectURL(webm);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            resolve();
          });
        }
      };
      img.src = imgData;
    });
  });
}