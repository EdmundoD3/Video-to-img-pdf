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
  const pdf = new jsPDF({ orientation });

  const pageWidth = pxToMm(width);
  const pageHeight = pxToMm(height);

  images.forEach((img, i) => {
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
// 📂 Manejo del archivo
// ==========================
class FileManager {
  constructor({dropZone, titleFile}) {
    this.dropZone = dropZone;
    this.titleFile = titleFile;
  }

  set title(value) {
    this.titleFile.textContent = value;
  }

  hideInputForm() {
    this.dropZone.classList.add("none");
  }

  resetAndShowInputForm() {
    this.title = "Not selected file";
    this.dropZone.classList.remove("none");
  }

  enableDrop(videoManager) {
    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length > 0) {
        videoManager.inputFile(e.dataTransfer.files[0]);
      }
    });
  }
}

// ==========================
// 🎞️ Manejo del video
// ==========================
class VideoManager {
  constructor({ video, canvas, startTime, endTime, lapTime, videoInput, fileManager, progressBar }) {
    this.video = video;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.startTime = parseInt(startTime.value) || 0;
    this.endTime = parseInt(endTime.value) || 0;
    this.lapTime = parseInt(lapTime.value) || 5;
    this.videoInput = videoInput;
    this.fileManager = fileManager;
    this.name = null;
    this.duration = null;
    this.progressBar = progressBar;
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
    this.duration = await this.getVideoDuration();
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
    this.duration = null;
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
    for (const time of times) {
      this.progressBar.update(Math.round((images.length / totalCaptures) * 100));
      await new Promise((resolve) => setTimeout(resolve, 100)); // Espera un poco para evitar problemas de rendimiento
      const img = await this.captureAt(time);
      images.push(img);
    }
    return images;
  }

  // async start() {
  //   if (!this.isLoaded()) return;
  //   const times = timeToArray(this.duration, this.lapTime, this.startTime);
  //   const captures = await this.captureMultiple(times);

  //   await generatePDF(captures, {
  //     name: getVideoFileName(this.name),
  //     width: this.video.videoWidth,
  //     height: this.video.videoHeight
  //   });
  // }
  async start(format = "pdf") {
    if (!this.isLoaded()) return;
    showLoader();
    try {
      const times = timeToArray(this.endTime | this.duration, this.lapTime, this.startTime);
      const totalCaptures = times.length;
      const captures = await this.captureMultiple(times, totalCaptures);
      const data = {
        name: getVideoFileName(this.name),
        width: this.video.videoWidth,
        height: this.video.videoHeight
      };

      if (format === "pdf") {
        await generatePDF(captures, data);
      } else if (format === "jpg") {
        await downloadAsZip(captures, data.name);
      }
    } finally {
      hideLoader();
    }
  }


}

// ==========================
// 📦 UI/UX - Drag & Drop
// ==========================
class DropContainerManager {
  constructor({dropZone, dropTitle,videoInput}) {
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
class ProgressBar {
  constructor(porcentaje) {
    this.porcentaje = porcentaje;
  }

  update(value) {
    this.porcentaje.textContent = `${value}%`;
    // this.porcentaje.style.width = `${value}%`;
  }
}
const progressBar = new ProgressBar(porcentaje);

const fileManager = new FileManager({dropZone,titleFile: document.getElementById("title-file")});
const videoManager = new VideoManager({
  video,
  canvas,
  videoInput,
  startTime: document.getElementById("startTimeInput"),
  lapTime: document.getElementById("lapTimeInput"),
  fileManager,
  progressBar,
  endTime: document.getElementById("endTimeInput"),
});
console.log(videoInput);
const dropManager = new DropContainerManager({dropZone, dropTitle, videoInput});
dropManager.activate();

videoManager.inputStart();
fileManager.enableDrop(videoManager);

captureBtn.addEventListener("click", () => {
  videoManager.startTime = parseInt(document.getElementById("startTimeInput").value);
  videoManager.endTime = parseInt(document.getElementById("endTimeInput").value);
  videoManager.lapTime = parseInt(document.getElementById("lapTimeInput").value);
  const format = document.getElementById("formatSelector").value;
  videoManager.start(format);

});

deleteVideo.addEventListener("click", () => videoManager.deleteVideo());


function showLoader() {
  document.getElementById("loader").classList.remove("none");
}
function hideLoader() {
  document.getElementById("loader").classList.add("none");
}

async function downloadAsZip(images, baseName = "capturas") {
  const zip = new JSZip();
  images.forEach((imgData, index) => {
    const base64Data = imgData.split(',')[1];
    zip.file(`img_${index + 1}.jpg`, base64Data, { base64: true });
  });

  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = `${baseName}.zip`;
  a.click();
}

