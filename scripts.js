
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

const formatManager = new FormatManager({configContainer,firstTitle})
const timeManager = new TimeManager({
  startTime: startTimeInput,
  lapTime: document.getElementById("lapTimeInput"),
  endTime: endTimeInput,
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



videoInput.addEventListener("change", () => {
  if (videoInput.files.length > 0) {
    // Hay un archivo seleccionado
    formatManager.activate()
  } else {
    // No hay archivo seleccionado
    formatManager.desactivate()
  }
});
