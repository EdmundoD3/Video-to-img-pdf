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

async function generateGIF(images, baseName = "capturas_video", delay = 500) {
  return new Promise((resolve) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: 0, // Se establecerá con la primera imagen
      height: 0, // Se establecerá con la primera imagen
      workerScript: 'gif.worker.js'
    });

    let loadedImages = 0;
    let hasError = false;

    images.forEach((imgData) => {
      const img = new Image();
      img.onload = () => {
        if (!hasError) {
          // Establecer dimensiones del GIF con la primera imagen
          if (loadedImages === 0) {
            gif.options.width = img.width;
            gif.options.height = img.height;
          }

          gif.addFrame(img, { delay: delay, copy: true });
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