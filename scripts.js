const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const MAX_MOBILE_SIZE_MB = 50; // 50MB ejemplo
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
const startTimeInput = document.getElementById("startTimeInput");
const endTimeInput = document.getElementById("endTimeInput");
const configContainer = document.getElementById("config-container");
const firstTitle = document.getElementById("first-title");
const compressionInput = document.getElementById("conpression-input")

const formatManager = new FormatManager({configContainer,firstTitle})
const settingsManager = new SettingsManager({
  startTime: startTimeInput,
  lapTime: document.getElementById("lapTimeInput"),
  endTime: endTimeInput,
  compressionInput,
  intervalMedia,
});

const progressBar = new ProgressBar(porcentaje, document.getElementById("loader-message"));
const fileManager = new FileManager({ dropZone, titleFile: document.getElementById("title-file"),formatManager });
const videoManager = new VideoManager({
  video,
  canvas,
  videoInput,
  fileManager,
  progressBar,
  settingsManager,
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

videoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (isMobile && file.size > MAX_MOBILE_SIZE_MB * 1024 * 1024) {
    showError(`Archivo muy pesado para móvil (>${MAX_MOBILE_SIZE_MB}MB). 
              Usa un video más corto o cambia a modo escritorio.`);
    videoInput.value = ''; // Limpiar input
    return;
  }
  if (videoInput.files.length > 0) {
    // Hay un archivo seleccionado
    formatManager.activate()
  } else {
    // No hay archivo seleccionado
    formatManager.desactivate()
  }
});


// clean
// Al iniciar la aplicación
window.addEventListener('load', () => {
  if (performance.navigation.type === 1) { // 1 indica recarga
    cleanupMedia();
  }
});

// Al cerrar la pestaña/navegador
window.addEventListener('beforeunload', () => {
  cleanupMedia();
});

function cleanupMedia() {
  // Limpiar src del video
  const videoElement = document.getElementById('video');
  if (videoElement) {
    videoElement.src = '';
    videoElement.removeAttribute('src');
    videoElement.load();
  }
  
  // Liberar URLs de objetos creados
  if (window.mediaBlobUrl) {
    URL.revokeObjectURL(window.mediaBlobUrl);
    delete window.mediaBlobUrl;
  }
  
  // Limpiar canvas
  const canvas = document.getElementById('canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  // Limpiar almacenamiento local/session
  sessionStorage.removeItem('videoState');
}
// if(isMobile) document.getElementById("mobile-message").classList.remove("none")