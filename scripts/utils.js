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
async function generatePDF(images, {
  baseName = "capturas_video",
  width,
  height,
  compression = 100
}) {
  if (!images?.length) throw new Error("No hay imágenes para generar PDF");

  const orientation = width > height ? "landscape" : "portrait";
  const pageWidth = pxToMm(width);
  const pageHeight = pxToMm(height);

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWidth, pageHeight],
    hotfixes: ["px_scaling"]
  });

  for (let i = 0; i < images.length; i++) {
    let imgData = images[i];

    if (compression < 100) {
      // Usar la función unificada de compresión
      imgData = await compressImage(imgData, compression, typeImage);
    }

    if (i > 0) pdf.addPage([pageWidth, pageHeight], orientation);

    pdf.addImage(imgData, typeImage.toUpperCase(), 0, 0, pageWidth, pageHeight,
      undefined, compression < 50 ? 'FAST' : 'MEDIUM');

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(`Página ${i + 1}`, pageWidth - 30, pageHeight - 10);
  }

  pdf.save(`${baseName}-converted-to-PDF.pdf`);
}
// ==========================
// 🖨️ Generador de Gif
// ==========================

async function generateGIF(images, { baseName = "capturas_video", delay = 500, compression = 100 }) {
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

async function downloadAsZip(images, { 
  baseName = "capturas", 
  startTime = 0, 
  lapTime,
  compression = 100
}) {
  if (!images?.length) throw new Error("No hay imágenes para comprimir");
  
  if (compression <= 0 || compression > 100) {
    throw new Error("El porcentaje de compresión debe estar entre 1 y 100");
  }

  const zip = new JSZip();
  const quality = compression / 100;

  // Procesar imágenes en lotes
  const batchSize = 5;
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    await Promise.all(batch.map(async (imgData, batchIndex) => {
      try {
        const globalIndex = i + batchIndex;
        const time = startTime + lapTime * globalIndex;
        
        if (typeof imgData !== 'string') {
          throw new Error(`La imagen ${globalIndex + 1} no es un dato válido`);
        }

        let base64Data;
        if (compression < 100) {
          const compressedData = await compressImage(imgData, compression, 'jpeg');
          base64Data = extractBase64(compressedData);
        } else {
          base64Data = extractBase64(imgData);
        }
        
        // Verificación adicional
        if (typeof base64Data !== 'string' || base64Data.includes('data:')) {
          throw new Error(`Formato incorrecto en imagen ${globalIndex + 1}`);
        }
        
        zip.file(`img_${baseName}_${time}s_${globalIndex + 1}.jpg`, base64Data, { 
          base64: true,
          compression: compression < 100 ? "STORE" : "DEFLATE"
        });
      } catch (error) {
        console.error(`Error procesando imagen ${i + batchIndex + 1}:`, error);
        throw error; // Opcional: puedes decidir continuar con las demás imágenes
      }
    }));
  }

  try {
    const content = await zip.generateAsync({
      type: "blob",
      compression: compression < 100 ? "STORE" : "DEFLATE"
    });

    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.zip`;
    document.body.appendChild(a);
    a.click();
    
    // Limpieza inmediata después de click (no necesitas esperar 100ms)
    requestAnimationFrame(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  } catch (error) {
    console.error("Error generando el ZIP:", error);
    throw error;
  }
}

// Función de compresión mejorada
async function compressImage(imageData, qualityPercent, outputType = 'jpeg') {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      
      const quality = outputType === 'png' ? 
        Math.min(1, qualityPercent / 100) : 
        qualityPercent / 100;
      
      resolve(canvas.toDataURL(`image/${outputType}`, quality));
    };
    img.src = imageData;
  });
}

/**
 * Extrae solo la parte Base64 de un Data URL
 * @param {string} dataUrl - Ej: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
 * @returns {string} - Solo la parte Base64
 */
function extractBase64(dataUrl) {
  if (typeof dataUrl !== 'string') {
    return dataUrl; // Asumimos que ya es base64 si no es string
  }

  if (!dataUrl.startsWith('data:')) {
    return dataUrl; // Ya está en formato base64
  }

  const commaPos = dataUrl.indexOf(',');
  if (commaPos === -1) {
    throw new Error(`Data URL mal formado: ${dataUrl.substring(0, 50)}${dataUrl.length > 50 ? '...' : ''}`);
  }

  return dataUrl.slice(commaPos + 1);
}

// Función de compresión (actualizada para devolver solo Base64)
async function compressImage(imageData, qualityPercent, outputType = typeImage) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const scale = qualityPercent < 50 ? 
        Math.max(0.1, qualityPercent / 100 * 1.5) : 
        qualityPercent / 100;
      
      canvas.width = Math.max(1, img.width * scale);
      canvas.height = Math.max(1, img.height * scale);
      
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const quality = outputType === 'png' ? 1.0 : Math.min(0.9, 0.7 * (qualityPercent / 100));
      const fullDataUrl = canvas.toDataURL(`image/${outputType}`, quality);
      resolve(extractBase64(fullDataUrl)); // Devuelve solo Base64
    };
    img.src = imageData;
  });
}
/**
 * Función optimizada para compresión de imágenes (compatible con PDF y ZIP)
 * @param {string} imageData - DataURL de la imagen (ej: 'data:image/jpeg;base64,...')
 * @param {number} qualityPercent - Porcentaje de calidad (1-100)
 * @param {string} [outputType='jpeg'] - Tipo de salida ('jpeg' o 'png')
 * @returns {Promise<string>} - DataURL de la imagen comprimida
 */
async function compressImage(imageData, qualityPercent, outputType = typeImage) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calcular escala inteligente (mayor reducción para calidades bajas)
      const scale = qualityPercent < 50 ?
        Math.max(0.1, qualityPercent / 100 * 1.5) :
        qualityPercent / 100;

      canvas.width = Math.max(1, img.width * scale);
      canvas.height = Math.max(1, img.height * scale);

      // Configurar calidad de renderizado
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convertir con calidad ajustada (0.7 es un buen balance para PDF)
      const quality = outputType === 'png' ? 1.0 : Math.min(0.9, 0.7 * (qualityPercent / 100));
      const compressedData = canvas.toDataURL(`image/${outputType}`, quality);
      resolve(compressedData);
    };
    img.src = imageData;
  });
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
function showError(message) {
  const errorBox = document.createElement('div');
  errorBox.className = 'mobile-error';
  errorBox.textContent = message;
  document.body.prepend(errorBox);
  setTimeout(() => errorBox.remove(), 5000);
}