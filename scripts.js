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
  const orientation = width > height ? "landscape" : "portrait";
  const pageWidth = pxToMm(width);
  const pageHeight = pxToMm(height);

  // Crea el PDF con el tamaño de página correcto desde el inicio
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWidth, pageHeight]  // Establece el tamaño personalizado
  });

  images.forEach((img, i) => {
    // Si no es la primera página, añade una nueva con el mismo tamaño
    if (i > 0) {
      pdf.addPage([pageWidth, pageHeight], orientation);
    }

    pdf.addImage(img, typeImage.toUpperCase(), 0, 0, pageWidth, pageHeight);
    pdf.setFontSize(12);
    pdf.text(`Página ${i + 1}`, pageWidth - 30, pageHeight - 10);
  });

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
async function downloadAsZip(images, {baseName = "capturas",startTime=0, lapTime}) {
  const zip = new JSZip();
  images.forEach((imgData, index) => {
    const base64Data = imgData.split(',')[1];
    const time = `_time-${startTime+lapTime*index}s`||"";
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

// ==========================
// 📂 Manejo del archivo
// ==========================
class FileManager {
  constructor({ dropZone, titleFile }) {
    this.dropZone = dropZone;
    this.titleFile = titleFile;
    this._id = 0;
  }

  set title(value) {
    this.titleFile.textContent = value;
  }
  get id() {
    return this._id;
  }

  hideInputForm() {
    this.dropZone.classList.add("none");
  }

  resetAndShowInputForm() {
    this.title = "Not selected file";
    this.dropZone.classList.remove("none");
    this.desactiveMemorizedCaptures();
  }

  enableDrop(videoManager) {
    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length > 0) {
        videoManager.inputFile(e.dataTransfer.files[0]);
        this._id++;
      }
    });
  }
}

// ==========================
// 🎞️ Manejo del video
// ==========================
class MemorizedParams {
  constructor({ startTime, lapTime, endTime, name, id }) {
    this.startTime = startTime;
    this.lapTime = lapTime;
    this.endTime = endTime;
    this.name = name;
    this.id = id;
  }
  actualize({ startTime, lapTime, endTime, name, id }) {
    this.startTime = startTime;
    this.lapTime = lapTime;
    this.endTime = endTime;
    this.name = name;
    this.id = id;
  }
  isSame({ startTime, lapTime, endTime, name }) {
    return this.startTime === startTime && this.lapTime === lapTime && this.endTime === endTime && this.name === name;
  }
}
class VideoManager {
  constructor({ video, canvas, format, videoInput, fileManager = new FileManager({}), 
  progressBar = new ProgressBar(), timeManager = new TimeManager({}), }) {
    this.timeManager = timeManager;
    this.video = video;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.videoInput = videoInput;
    this.fileManager = fileManager;
    this.name = null;
    this.progressBar = progressBar;
    this.captures = null;
    this._format = format;
    this.memorizedParams = new MemorizedParams({
      startTime: 0,
      lapTime: 0,
      endTime: 0,
      name: ""
    });
  }
  get format() {
    return this._format.value;
  }
  inputStart() {
    this.videoInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) await this.inputFile(file);
    });
  }


  async inputFile(file) {
    if (!file.type.includes("video/")) {
      alert("Por favor selecciona un archivo de video válido.");
      return;
    }
    this.name = file.name;
    this.video.src = URL.createObjectURL(file);
    // this.duration = await this.getVideoDuration();
    this.timeManager.setTimes({
      startTime: 0,
      lapTime: 5,
      endTime: await this.getVideoDuration(),
      maxTime: await this.getVideoDuration()
    });
    this.fileManager.title = file.name;
    this.fileManager.hideInputForm();
  }

  getVideoDuration() {
    return new Promise((resolve) => {
      if (this.video.readyState >= 1) {
        resolve(this.video.duration);
      } else {
        this.video.addEventListener("loadedmetadata", () => resolve(this.video.duration));
      }
    });
  }

  isLoaded() {
    if (!this.video.src || !this.name) {
      alert("Ingrese un video primero");
      return false;
    }
    return true;
  }

  deleteVideo() {
    this.name = null;
    // this.duration = null;
    this.timeManager.endTime = 0;
    this.video.src = "";
    this.fileManager.resetAndShowInputForm();
  }

  captureAt(time) {
    return new Promise((resolve) => {
      const handler = () => {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.context.drawImage(this.video, 0, 0);
        resolve(this.canvas.toDataURL(`image/${typeImage}`));
        this.video.removeEventListener("timeupdate", handler);
      };
      this.video.currentTime = time;
      this.video.addEventListener("timeupdate", handler, { once: true });
    });
  }

  async captureMultiple(times, totalCaptures) {
    const images = [];
    this.progressBar.updateMessage("Capturando imágenes...");
    for (const time of times) {
      this.progressBar.updatePorcentaje(Math.round((images.length / totalCaptures) * 100));
      await new Promise((resolve) => setTimeout(resolve, 100)); // Espera un poco para evitar problemas de rendimiento
      const img = await this.captureAt(time);
      images.push(img);
    }
    this.progressBar.updatePorcentaje(100);
    return images;
  }

  async start() {
    if (!this.isLoaded()) return;
    showLoader();
    try {
      const times = this.timeManager.getTimes(); //timeToArray(this.endTime | this.duration, this.lapTime, this.startTime);
      const timeParams = this.timeManager.params;
      const isSameArchiveAndParams = this.memorizedParams.isSame({
        ...timeParams,
        name: this.name,
        id: this.fileManager.id
      })
      if (!isSameArchiveAndParams || this.captures === null) {
        this.memorizedParams.actualize({
          ...timeParams,
          name: this.name,
          id: this.fileManager.id
        })
        const totalCaptures = times.length;
        this.captures = await this.captureMultiple(times, totalCaptures);
      }
      this.progressBar.ocultPorcentaje();
      this.progressBar.updateMessage("Generando archivo...");

      const data = {
        name: getVideoFileName(this.name),
        width: this.video.videoWidth,
        height: this.video.videoHeight
      };

      if (this.format === "pdf") {
        await generatePDF(this.captures, data);
      } else if (this.format === "jpg") {
        const {lapTime,startTime}=this.timeManager.params
        await downloadAsZip(this.captures, {baseName:data.name, lapTime, startTime});
      } else if (this.format === "gif") {
        await generateGIF(this.captures, data.name, this.timeManager.intervalMedia * 10);
        // } else if (format === "webp") {
        //   await generateWebP(this.captures, data.name);
      }
    } catch (er){
      console.error(er)
    } finally {
      hideLoader();
    }
  }
}

// ==========================
// 📦 UI/UX - Drag & Drop
// ==========================
class DropContainerManager {
  constructor({ dropZone, dropTitle, videoInput }) {
    this.dropZone = dropZone;
    this.dropTitle = dropTitle;
    this.videoInput = videoInput;
  }

  set title(value) {
    this.dropTitle.textContent = value;
  }

  activate() {
    this.dropZone.addEventListener("click", () => this.videoInput.click());
    this.dropTitle.addEventListener("click", () => this.videoInput.click());

    this.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.dropZone.classList.add("drag-over");
    });

    this.dropZone.addEventListener("dragleave", () => {
      this.dropZone.classList.remove("drag-over");
    });
  }
}

// ==========================
// 🚀 Inicialización
// ==========================
const videoInput = document.getElementById("videoUpload");
const dropZone = document.getElementById("header");
const dropTitle = document.getElementById("drop-title-file");
const deleteVideo = document.getElementById("deleteVideo");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("captureBtn");
const porcentaje = document.getElementById("porcentaje");
const format = document.getElementById("formatSelector");
const intervalMedia = document.getElementById("media-interval-input");

class TimeManager {
  constructor({ startTime, lapTime, endTime,intervalMedia }) {
    this.startTimeElement = startTime;
    this.lapTimeElement = lapTime;
    this.endTimeElement = endTime;
    this._maxTime = 0;
    this._intervalMedia = intervalMedia;
  }
  get maxTime() {
    return this._maxTime;
  }
  set maxTime(value) {
    this._maxTime = value;
    this.endTimeElement.max = value;
    this._intervalMedia.max = value;
  }
  get endTime() {
    return parseInt(this.endTimeElement.value) || 0;
  }
  get intervalMedia() {
    return parseInt(this._intervalMedia.value) || 0;
  }

  set endTime(value) {
    // this.startTimeElement.max = value;
    this.endTimeElement.value = value;
  }
  get lapTime() {

    return parseInt(this.lapTimeElement.value) || 5;
  }
  set lapTime(value) {
    this.lapTimeElement.max = this.endTime;
    this.lapTimeElement.value = value;
  }
  get startTime() {
    const startTime = parseInt(this.startTimeElement.value) || 0;
    if (startTime > this.endTime) {
      this.startTimeElement.value = this.endTime;
      return this.endTime;
    }
    return parseInt(this.startTimeElement.value) || 0;
  }
  set startTime(value) {
    this.startTimeElement.max = this.endTime;
    this.startTimeElement.value = value;
  }
  clear() {
    this.startTime = 0;
    this.lapTime = 5;
    this.endTime = 0;
    this.maxTime = 0;
  }
  setTimes({ startTime, lapTime, endTime, maxTime }) {
    this.endTime = endTime;
    this.maxTime = maxTime;
    this.startTime = startTime;
    this.lapTime = lapTime;

  }

  getTimes() {
    return timeToArray(this.endTime ?? this.maxTime, this.lapTime, this.startTime);
  }
  get params() {
    return {
      startTime: this.startTime,
      lapTime: this.lapTime,
      endTime: this.endTime
    };
  }
}
const startTimeInput = document.getElementById("startTimeInput");
const endTimeInput = document.getElementById("endTimeInput");
const timeManager = new TimeManager({
  startTime: startTimeInput,
  lapTime: document.getElementById("lapTimeInput"),
  endTime: endTimeInput,
  intervalMedia,
});

class ProgressBar {
  constructor(porcentaje, message) {
    this.porcentaje = porcentaje;
    this.message = message;
  }

  updatePorcentaje(value) {
    this.porcentaje.textContent = `${value}%`;
  }
  ocultPorcentaje() {
    this.porcentaje.textContent = "";
  }

  updateMessage(message) {
    this.message.textContent = message;
  }
  clear() {
    this.message.textContent = "Cargando...";
  }
}
const progressBar = new ProgressBar(porcentaje, document.getElementById("loader-message"));

const fileManager = new FileManager({ dropZone, titleFile: document.getElementById("title-file") });
const videoManager = new VideoManager({
  video,
  canvas,
  videoInput,
  fileManager,
  progressBar,
  timeManager,
  format,
});
const dropManager = new DropContainerManager({ dropZone, dropTitle, videoInput });
dropManager.activate();

videoManager.inputStart();
fileManager.enableDrop(videoManager);

captureBtn.addEventListener("click", () => videoManager.start());

deleteVideo.addEventListener("click", () => videoManager.deleteVideo());


const showLoader = () => document.getElementById("loader").classList.remove("none");

function hideLoader() {
  document.getElementById("loader").classList.add("none");
}



// ==========================
// 🖨️ Formato de salida
// ==========================
const IntervalList = ["gif"]
const gifIntervalLabel = document.getElementById("gifIntervalLabel");
format.addEventListener("change", () => {
  const selectedFormat = format.value;
  if (IntervalList.includes(selectedFormat)) {
    gifIntervalLabel.classList.remove("none");
  } else {
    gifIntervalLabel.classList.add("none");
  }
});

startTimeInput.addEventListener("input", () => {
  // Obtener el valor del input y asignarlo al currentTime del video
  const startTime = parseFloat(startTimeInput.value);
  
  if (!isNaN(startTime)) {
    video.currentTime = startTime;  // Ajusta el tiempo de inicio del video
  }
});
endTimeInput.addEventListener("input", () => {
  // Obtener el valor del input y asignarlo al currentTime del video
  const startTime = parseFloat(endTimeInput.value);
  
  if (!isNaN(startTime)) {
    video.currentTime = startTime;  // Ajusta el tiempo de inicio del video
  }
});

const configContainer = document.getElementById("config-container");
const firstTitle = document.getElementById("first-title");

videoInput.addEventListener("change", () => {
  if (videoInput.files.length > 0) {
    // Hay un archivo seleccionado
    configContainer.classList.remove("none");
    firstTitle.textContent = "Configura el video y selecciona el formato de salida";
  } else {
    // No hay archivo seleccionado
    configContainer.classList.add("none");
    firstTitle.textContent = "Arrastra un video aqui para convertirlo en pdf, gif o zip de jpg";
  }
});

