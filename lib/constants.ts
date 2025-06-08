export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://192.168.4.1:5000'
  : 'http://localhost:5000';

export const SOCKET_URL = API_BASE_URL;

export const DEFAULT_CONFIG = {
  detection: {
    zoneStart: 70,
    zoneWidth: 20,
    showZone: true,
    threshold: 0.5,
    autoCount: true
  },
  visual: {
    showBoxes: true,
    showLabels: true,
    showConfidence: true,
    zoneColor: "#ff0000",
    boxColor: "#00ff00",
    zoneOpacity: 0.2
  },
  advanced: {
    resolution: "640x480",
    frameRate: 30,
    model: "yolov5s",
    processingSpeed: "balanced",
    preset: "retail"
  }
};

export const PRESETS = {
  retail: {
    detection: { threshold: 0.7, autoCount: true },
    visual: { showBoxes: true, showLabels: true, showConfidence: false }
  },
  demo: {
    detection: { threshold: 0.5, autoCount: true },
    visual: { showBoxes: true, showLabels: true, showConfidence: true }
  },
  debug: {
    detection: { threshold: 0.3, autoCount: false },
    visual: { showBoxes: true, showLabels: true, showConfidence: true }
  }
};

export const PRODUCT_OPTIONS = [
  "person", "laptop", "smartphone", "mouse", "keyboard", 
  "headphones", "monitor", "tablet", "usb drive", "hard drive", "webcam",
  "indomie", "indomilk", "kecap", "keju", "sabun"
];