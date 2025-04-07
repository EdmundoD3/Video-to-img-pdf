Video Converter Tool 🌍 <button id="toggleLang">Español</button>
<div id="english-content">
📹 Video to PDF/GIF/ZIP Converter
Project Preview

A web application that converts video frames to PDF documents, animated GIFs, or ZIP archives of JPG images directly in the browser.

🌟 Features
Multiple Output Formats:

📄 PDF documents with customizable compression

🎞️ Animated GIFs with adjustable frame delay

📦 ZIP archives containing individual JPG frames

Customizable Capture Settings:

⏱️ Set start/end times for frame extraction

⏲️ Adjust capture interval (seconds between frames)

🗜️ Compression quality control (20-100%)

User-Friendly Interface:

🖱️ Drag & drop video file support

📊 Real-time progress indicator

🎥 Video preview with scrubbing

🛠️ Technical Highlights
Smart caching system with MemorizedParams for recaptures

PDF generation with jsPDF

Web Workers for non-blocking GIF generation

Responsive design with drag & drop handling

Optimized processing with batch image handling

🚀 Quick Start
Open the application in your web browser

Upload a video file by dragging or clicking the drop zone

Configure capture settings

Click "Capture and Download"

Wait for processing and save your file

📦 Dependencies
jsPDF

JSZip

gif.js

Whammy.js

🏗️ Architecture
Object-oriented design with main classes:

FileManager, VideoManager, SettingsManager

DropContainerManager, ProgressBar

</div><div id="spanish-content" style="display:none">
📹 Conversor de Video a PDF/GIF/ZIP
Vista Previa

Aplicación web que convierte frames de video a documentos PDF, GIFs animados o archivos ZIP con imágenes JPG directamente en el navegador.

🌟 Características
Múltiples formatos de salida:

📄 Documentos PDF con compresión ajustable

🎞️ GIFs animados con intervalo configurable

📦 Archivos ZIP con imágenes JPG individuales

Ajustes personalizables:

⏱️ Configurar tiempos de inicio/fin

⏲️ Ajustar intervalo entre capturas

🗜️ Control de calidad de compresión (20-100%)

Interfaz amigable:

🖱️ Soporte para arrastrar y soltar archivos

📊 Indicador de progreso en tiempo real

🎥 Vista previa del video con navegación

🛠️ Aspectos Técnicos Destacados
Sistema de caché inteligente con MemorizedParams para recapturas

Generación de PDFs con jsPDF

Web Workers para generación de GIFs sin bloquear la interfaz

Diseño responsive con manejo de drag & drop

Procesamiento optimizado con manejo de imágenes por lotes

🚀 Guía Rápida
Abre la aplicación en tu navegador

Sube un video arrastrando o haciendo clic en la zona designada

Configura los ajustes de captura

Haz clic en "Capturar y Descargar"

Espera a que termine el procesamiento y guarda tu archivo

📦 Dependencias
jsPDF

JSZip

gif.js

Whammy.js

🏗️ Arquitectura
Diseño orientado a objetos con clases principales:

FileManager, VideoManager, SettingsManager

DropContainerManager, ProgressBar

</div><script> document.getElementById('toggleLang').addEventListener('click', function() { const english = document.getElementById('english-content'); const spanish = document.getElementById('spanish-content'); const button = this; if (english.style.display === 'none') { english.style.display = 'block'; spanish.style.display = 'none'; button.textContent = 'Español'; } else { english.style.display = 'none'; spanish.style.display = 'block'; button.textContent = 'English'; } }); </script><style> #toggleLang { background: #2c3e50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 10px; font-size: 14px; } #toggleLang:hover { background: #1a252f; } </style>

🙏 Credits
Developed with these open source libraries:

jsPDF, JSZip, gif.js, Whammy.js