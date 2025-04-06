
// ==========================
// 📂 Manejo del archivo
// ==========================
class FileManager {
  constructor({ dropZone, titleFile, formatManager = new FormatManager({}) }) {
    this.dropZone = dropZone;
    this.titleFile = titleFile;
    this._id = 0;
    this.formatManager = formatManager
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
    this.formatManager.desactivate();
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
  constructor({ video = document.createElement("video"), canvas, format,
    videoInput = document.createElement("input"), fileManager = new FileManager({}),
    progressBar = new ProgressBar(), settingsManager = new SettingsManager({}) }) {
    if (!settingsManager instanceof SettingsManager)
      throw new Error("settingsManager no es válido. Debe ser una instancia de SettingsManager")
    if (!video instanceof HTMLInputElement)
      throw new Error("video no es válido. Debe ser una instancia de HTMLInputElement")
    if (!(settingsManager instanceof SettingsManager))
      throw new Error("settingsManager no es válido. Debe ser una instancia de SettingsManager.");

    if (!(video instanceof HTMLVideoElement))
      throw new Error("video no es válido. Debe ser una instancia de HTMLVideoElement.");

    if (!(canvas instanceof HTMLCanvasElement))
      throw new Error("canvas no es válido. Debe ser una instancia de HTMLCanvasElement.");

    if (!(videoInput instanceof HTMLInputElement))
      throw new Error("videoInput no es válido. Debe ser una instancia de HTMLInputElement.");

    if (!(fileManager instanceof FileManager))
      throw new Error("fileManager no es válido. Debe ser una instancia de FileManager.");

    if (!(progressBar instanceof ProgressBar))
      throw new Error("progressBar no es válido. Debe ser una instancia de ProgressBar.");

    if (!(format instanceof HTMLSelectElement))
      throw new Error("format no es válido. Debe ser una instancia de HTMLSelectElement.");

    this.settingsManager = settingsManager;
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
  clearFileInput = () => {
    this.videoInput.value = '';
    this.videoInput.type = '';
    this.videoInput.type = 'file';
    
  };

  async inputFile(file) {
    if (!file.type.includes("video/")) {
      alert("Por favor selecciona un archivo de video válido.");
      return;
    }
    this.name = file.name;
    this.video.src = URL.createObjectURL(file);
    // this.duration = await this.getVideoDuration();
    this.settingsManager.setTimes({
      startTime: 0,
      lapTime: 1,
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
    // Liberar URL de objeto
    if (this.video.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.video.src);
    }

    this.name = null;
    this.video.src = "";
    this.clearFileInput();
    this.fileManager.resetAndShowInputForm();
    this.settingsManager.clear();
    // Limpiar el elemento de video
    this.video.load();
    // Liberar memoria
    if (this.video.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.video.src);
    }
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Resetear estado
    this.name = null;
    this.captures = null;
    this.clearFileInput();
    // Forzar garbage collection (en algunos navegadores)
    if (window.gc) {
      window.gc();
    }
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
      const times = this.settingsManager.getTimes(); //timeToArray(this.endTime | this.duration, this.lapTime, this.startTime);
      const timeParams = this.settingsManager.params;
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
        height: this.video.videoHeight,
        compression: this.settingsManager.compression
      };

      if (this.format === "pdf") {
        await generatePDF(this.captures, data);
      } else if (this.format === "jpg") {
        const { lapTime, startTime } = this.settingsManager.params
        await downloadAsZip(this.captures, { baseName: data.name, lapTime, startTime });
      } else if (this.format === "gif") {
        await generateGIF(this.captures,{
          baseName: data.name,
          delay: this.settingsManager.intervalMedia,
          compression:this.settingsManager.compression
        });
        // } else if (format === "webp") {
        //   await generateWebP(this.captures, data.name);
      }
    } catch (er) {
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
class SettingsManager {
  constructor({ startTime, lapTime, endTime, intervalMedia, compressionInput }) {
    this.startTimeElement = startTime;
    this.lapTimeElement = lapTime;
    this.endTimeElement = endTime;
    this._maxTime = 0;
    this._intervalMedia = intervalMedia;
    this.compressionInput = compressionInput
  }
  get maxTime() {
    return this._maxTime;
  }
  set maxTime(value) {
    this._maxTime = value;
    this.endTimeElement.max = value;
  }
  get endTime() {
    return parseFloat(this.endTimeElement.value) || 0;
  }
  get intervalMedia() {
    return parseFloat(this._intervalMedia.value) || 0;
  }

  set endTime(value) {
    // this.startTimeElement.max = value;
    this._intervalMedia.max = value * 1000;
    this.endTimeElement.value = value;
  }
  get lapTime() {
    return parseFloat(this.lapTimeElement.value) || 1;
  }
  set lapTime(value) {
    this.lapTimeElement.max = this.endTime;
    this.lapTimeElement.value = value;
  }
  get startTime() {
    const startTime = parseFloat(this.startTimeElement.value) || 0;
    if (startTime > this.endTime) {
      this.startTimeElement.value = this.endTime;
      return this.endTime;
    }
    return parseFloat(this.startTimeElement.value) || 0;
  }
  set startTime(value) {
    this.startTimeElement.max = this.endTime;
    this.startTimeElement.value = value;
  }
  get compression(){
    return parseFloat(this.compressionInput.value);
  }

  clear() {
    this.startTime = 0;
    this.lapTime = 1;
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
      endTime: this.endTime,
      compression:this.compression
    };
  }
}
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
class FormatManager {
  constructor({ configContainer, firstTitle }) {
    this.configContainer = configContainer;
    this.firstTitle = firstTitle;
  }
  activate() {
    this.configContainer.classList.remove("none");
    this.firstTitle.textContent = "Configura el video y selecciona el formato de salida";
  }
  desactivate() {
    configContainer.classList.add("none");
    firstTitle.textContent = "Arrastra un video aqui para convertirlo en pdf, gif o zip de jpg";
  }
}