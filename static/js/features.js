const simulationToggle = document.getElementById("simulationToggle");
const simulationStatus = document.getElementById("simulationStatus");
const addSimObjectBtn = document.getElementById("addSimObjectBtn");
const simulatedObjectsList = document.getElementById("simulatedObjectsList");
const testCountingBtn = document.getElementById("testCountingBtn");
const clearSimObjectsBtn = document.getElementById("clearSimObjectsBtn");

const configButton = document.getElementById("configButton");
const configTabs = document.querySelectorAll(".config-tab");
const configTabContents = document.querySelectorAll(".config-tab-content");

const configZoneStart = document.getElementById("configZoneStart");
const configZoneStartValue = document.getElementById("configZoneStartValue");
const configZoneWidth = document.getElementById("configZoneWidth");
const configZoneWidthValue = document.getElementById("configZoneWidthValue");
const configShowZone = document.getElementById("configShowZone");
const configThreshold = document.getElementById("configThreshold");
const configThresholdValue = document.getElementById("configThresholdValue");
const configAutoCount = document.getElementById("configAutoCount");

const configShowBoxes = document.getElementById("configShowBoxes");
const configShowLabels = document.getElementById("configShowLabels");
const configShowConfidence = document.getElementById("configShowConfidence");
const configZoneColor = document.getElementById("configZoneColor");
const configBoxColor = document.getElementById("configBoxColor");
const configZoneOpacity = document.getElementById("configZoneOpacity");
const configZoneOpacityValue = document.getElementById("configZoneOpacityValue");

const configResolution = document.getElementById("configResolution");
const configFrameRate = document.getElementById("configFrameRate");
const configFrameRateValue = document.getElementById("configFrameRateValue");
const configModel = document.getElementById("configModel");
const configProcessingSpeed = document.getElementById("configProcessingSpeed");
const configPreset = document.getElementById("configPreset");

const saveConfigBtn = document.getElementById("saveConfigBtn");
const resetConfigBtn = document.getElementById("resetConfigBtn");
const applyConfigBtn = document.getElementById("applyConfigBtn");

let isSimulationMode = false;
let simulatedObjects = {};
let selectedObjectId = null;

let defaultConfig = {
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

let currentConfig = { ...defaultConfig };

function loadConfig() {
  const saved = localStorage.getItem('self_checkout_config');
  if (saved) {
    currentConfig = { ...defaultConfig, ...JSON.parse(saved) };
  }
  applyConfigToUI();
}

function saveConfig() {
  localStorage.setItem('self_checkout_config', JSON.stringify(currentConfig));
  showNotification("Configuration saved successfully");
}

function resetConfig() {
  currentConfig = { ...defaultConfig };
  applyConfigToUI();
  showNotification("Configuration reset to defaults");
}

function applyConfigToUI() {
  configZoneStart.value = currentConfig.detection.zoneStart;
  configZoneStartValue.textContent = currentConfig.detection.zoneStart + '%';
  configZoneWidth.value = currentConfig.detection.zoneWidth;
  configZoneWidthValue.textContent = currentConfig.detection.zoneWidth + '%';
  configShowZone.checked = currentConfig.detection.showZone;
  configThreshold.value = currentConfig.detection.threshold;
  configThresholdValue.textContent = Math.round(currentConfig.detection.threshold * 100) + '%';
  configAutoCount.checked = currentConfig.detection.autoCount;

  configShowBoxes.checked = currentConfig.visual.showBoxes;
  configShowLabels.checked = currentConfig.visual.showLabels;
  configShowConfidence.checked = currentConfig.visual.showConfidence;
  configZoneColor.value = currentConfig.visual.zoneColor;
  configBoxColor.value = currentConfig.visual.boxColor;
  configZoneOpacity.value = currentConfig.visual.zoneOpacity;
  configZoneOpacityValue.textContent = Math.round(currentConfig.visual.zoneOpacity * 100) + '%';

  configResolution.value = currentConfig.advanced.resolution;
  configFrameRate.value = currentConfig.advanced.frameRate;
  configFrameRateValue.textContent = currentConfig.advanced.frameRate + ' FPS';
  configModel.value = currentConfig.advanced.model;
  configProcessingSpeed.value = currentConfig.advanced.processingSpeed;
  configPreset.value = currentConfig.advanced.preset;

  updateColorLabels();
}

function updateColorLabels() {
  const zoneColorLabel = document.querySelector('#configZoneColor + .config-color-label');
  const boxColorLabel = document.querySelector('#configBoxColor + .config-color-label');
  
  if (zoneColorLabel) {
    zoneColorLabel.textContent = getColorName(configZoneColor.value);
  }
  if (boxColorLabel) {
    boxColorLabel.textContent = getColorName(configBoxColor.value);
  }
}

function getColorName(hex) {
  const colors = {
    '#ff0000': 'Red',
    '#00ff00': 'Green',
    '#0000ff': 'Blue',
    '#ffff00': 'Yellow',
    '#ff00ff': 'Magenta',
    '#00ffff': 'Cyan',
    '#ffffff': 'White',
    '#000000': 'Black',
    '#ffa500': 'Orange',
    '#800080': 'Purple'
  };
  return colors[hex.toLowerCase()] || 'Custom';
}

function applyPreset(preset) {
  switch (preset) {
    case 'retail':
      currentConfig = {
        ...currentConfig,
        detection: { ...currentConfig.detection, threshold: 0.7, autoCount: true },
        visual: { ...currentConfig.visual, showBoxes: true, showLabels: true, showConfidence: false }
      };
      break;
    case 'demo':
      currentConfig = {
        ...currentConfig,
        detection: { ...currentConfig.detection, threshold: 0.5, autoCount: true },
        visual: { ...currentConfig.visual, showBoxes: true, showLabels: true, showConfidence: true }
      };
      break;
    case 'debug':
      currentConfig = {
        ...currentConfig,
        detection: { ...currentConfig.detection, threshold: 0.3, autoCount: false },
        visual: { ...currentConfig.visual, showBoxes: true, showLabels: true, showConfidence: true }
      };
      break;
  }
  applyConfigToUI();
}

function initConfigTabs() {
  configTabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
      configTabs.forEach(t => t.classList.remove('active'));
      configTabContents.forEach(content => content.classList.remove('active'));
      
      this.classList.add('active');
      const tabName = this.getAttribute('data-config-tab');
      const content = document.getElementById(tabName + 'ConfigTab');
      if (content) {
        content.classList.add('active');
      }
    });
  });
}

function initConfigControls() {
  configZoneStart.addEventListener('input', function() {
    currentConfig.detection.zoneStart = parseInt(this.value);
    configZoneStartValue.textContent = this.value + '%';
    socket.emit('update_detection_config', currentConfig.detection);
  });

  configZoneWidth.addEventListener('input', function() {
    currentConfig.detection.zoneWidth = parseInt(this.value);
    configZoneWidthValue.textContent = this.value + '%';
    socket.emit('update_detection_config', currentConfig.detection);
  });

  configShowZone.addEventListener('change', function() {
    currentConfig.detection.showZone = this.checked;
    socket.emit('update_detection_config', currentConfig.detection);
  });

  configThreshold.addEventListener('input', function() {
    currentConfig.detection.threshold = parseFloat(this.value);
    configThresholdValue.textContent = Math.round(this.value * 100) + '%';
    socket.emit('update_detection_config', currentConfig.detection);
  });

  configAutoCount.addEventListener('change', function() {
    currentConfig.detection.autoCount = this.checked;
    socket.emit('update_detection_config', currentConfig.detection);
  });

  configShowBoxes.addEventListener('change', function() {
    currentConfig.visual.showBoxes = this.checked;
    socket.emit('update_visual_config', currentConfig.visual);
  });

  configShowLabels.addEventListener('change', function() {
    currentConfig.visual.showLabels = this.checked;
    socket.emit('update_visual_config', currentConfig.visual);
  });

  configShowConfidence.addEventListener('change', function() {
    currentConfig.visual.showConfidence = this.checked;
    socket.emit('update_visual_config', currentConfig.visual);
  });

  configZoneColor.addEventListener('change', function() {
    currentConfig.visual.zoneColor = this.value;
    updateColorLabels();
    socket.emit('update_visual_config', currentConfig.visual);
  });

  configBoxColor.addEventListener('change', function() {
    currentConfig.visual.boxColor = this.value;
    updateColorLabels();
    socket.emit('update_visual_config', currentConfig.visual);
  });

  configZoneOpacity.addEventListener('input', function() {
    currentConfig.visual.zoneOpacity = parseFloat(this.value);
    configZoneOpacityValue.textContent = Math.round(this.value * 100) + '%';
    socket.emit('update_visual_config', currentConfig.visual);
  });

  configResolution.addEventListener('change', function() {
    currentConfig.advanced.resolution = this.value;
    socket.emit('update_advanced_config', currentConfig.advanced);
  });

  configFrameRate.addEventListener('input', function() {
    currentConfig.advanced.frameRate = parseInt(this.value);
    configFrameRateValue.textContent = this.value + ' FPS';
    socket.emit('update_advanced_config', currentConfig.advanced);
  });

  configModel.addEventListener('change', function() {
    currentConfig.advanced.model = this.value;
    socket.emit('update_advanced_config', currentConfig.advanced);
  });

  configProcessingSpeed.addEventListener('change', function() {
    currentConfig.advanced.processingSpeed = this.value;
    socket.emit('update_advanced_config', currentConfig.advanced);
  });

  configPreset.addEventListener('change', function() {
    if (this.value !== 'custom') {
      applyPreset(this.value);
      socket.emit('apply_preset_config', this.value);
    }
  });

  saveConfigBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    saveConfig();
  });
  
  resetConfigBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    resetConfig();
  });
  
  applyConfigBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    socket.emit('apply_full_config', currentConfig);
    showNotification("Configuration applied successfully");
  });
}

function renderSimulatedObjectsList() {
  simulatedObjectsList.innerHTML = "";
  
  if (Object.keys(simulatedObjects).length === 0) {
    const noObjects = document.createElement("div");
    noObjects.className = "no-objects";
    noObjects.textContent = "No simulated objects";
    simulatedObjectsList.appendChild(noObjects);
    testCountingBtn.disabled = true;
    selectedObjectId = null;
    return;
  }
  
  testCountingBtn.disabled = false;
  
  for (const [objId, objData] of Object.entries(simulatedObjects)) {
    const item = document.createElement("div");
    item.className = "sim-object-item";
    item.setAttribute("data-obj-id", objId);
    
    const info = document.createElement("div");
    info.className = "sim-object-info";
    
    const name = document.createElement("div");
    name.className = "sim-object-name";
    name.textContent = `${objData.label} (${objId})`;
    
    const details = document.createElement("div");
    details.className = "sim-object-details";
    details.textContent = `Position: (${objData.x}, ${objData.y}) | Size: ${objData.width}x${objData.height}`;
    
    info.appendChild(name);
    info.appendChild(details);
    
    const controls = document.createElement("div");
    controls.className = "sim-object-controls";
    
    const moveButtons = [
      { icon: "fas fa-arrow-up", direction: "up", title: "Move Up" },
      { icon: "fas fa-arrow-down", direction: "down", title: "Move Down" },
      { icon: "fas fa-arrow-left", direction: "left", title: "Move Left" },
      { icon: "fas fa-arrow-right", direction: "right", title: "Move Right" }
    ];
    
    moveButtons.forEach(btn => {
      const moveBtn = document.createElement("button");
      moveBtn.className = "sim-control-btn move-btn";
      moveBtn.innerHTML = `<i class="${btn.icon}"></i>`;
      moveBtn.title = btn.title;
      moveBtn.addEventListener("click", function() {
        socket.emit("move_simulated_object", {
          obj_id: objId,
          direction: btn.direction,
          step: 15
        });
      });
      controls.appendChild(moveBtn);
    });
    
    const selectBtn = document.createElement("button");
    selectBtn.className = "sim-control-btn move-btn";
    selectBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
    selectBtn.title = "Select for testing";
    selectBtn.addEventListener("click", function() {
      selectedObjectId = objId;
      
      document.querySelectorAll(".sim-object-item").forEach(item => {
        item.classList.remove("selected");
      });
      item.classList.add("selected");
      
      showNotification(`Selected ${objData.label} for testing`);
    });
    controls.appendChild(selectBtn);
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "sim-control-btn delete-btn";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = "Delete object";
    deleteBtn.addEventListener("click", function() {
      if (confirm(`Delete simulated ${objData.label}?`)) {
        socket.emit("remove_simulated_object", { obj_id: objId });
      }
    });
    controls.appendChild(deleteBtn);
    
    item.appendChild(info);
    item.appendChild(controls);
    simulatedObjectsList.appendChild(item);
  }
}

configButton.addEventListener("click", function() {
  showFloatingWindow('config');
});

simulationToggle.addEventListener("change", function() {
  isSimulationMode = this.checked;
  
  socket.emit("toggle_simulation", {
    enabled: isSimulationMode
  });
  
  if (isSimulationMode) {
    showFloatingWindow('simulation');
    simulationStatus.textContent = "🎮 Simulation Mode";
    simulationStatus.style.color = "#e74c3c";
    showNotification("Simulation mode enabled");
  } else {
    hideFloatingWindow('simulation');
  }
});

addSimObjectBtn.addEventListener("click", function() {
  const label = document.getElementById("simLabel").value;
  const x = parseInt(document.getElementById("simX").value);
  const y = parseInt(document.getElementById("simY").value);
  const width = parseInt(document.getElementById("simWidth").value);
  const height = parseInt(document.getElementById("simHeight").value);
  
  if (!label || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
    alert("Please fill all fields with valid values");
    return;
  }
  
  socket.emit("add_simulated_object", {
    label: label,
    x: x,
    y: y,
    width: width,
    height: height
  });
});

testCountingBtn.addEventListener("click", function() {
  if (selectedObjectId) {
    socket.emit("preset_move_to_zone", {
      obj_id: selectedObjectId
    });
  } else {
    alert("Please select an object first");
  }
});

clearSimObjectsBtn.addEventListener("click", function() {
  if (Object.keys(simulatedObjects).length === 0) {
    alert("No simulated objects to clear");
    return;
  }
  
  if (confirm("Are you sure you want to remove all simulated objects?")) {
    for (const objId in simulatedObjects) {
      socket.emit("remove_simulated_object", { obj_id: objId });
    }
  }
});

document.addEventListener("keydown", function(event) {
  if (!isSimulationMode || !selectedObjectId) return;
  
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;
  
  const keyMap = {
    "ArrowUp": "up",
    "ArrowDown": "down", 
    "ArrowLeft": "left",
    "ArrowRight": "right"
  };
  
  if (keyMap[event.key]) {
    event.preventDefault();
    socket.emit("move_simulated_object", {
      obj_id: selectedObjectId,
      direction: keyMap[event.key],
      step: event.shiftKey ? 5 : 15
    });
  }
  
  if (event.key === " " || event.key === "Spacebar") {
    event.preventDefault();
    socket.emit("preset_move_to_zone", { obj_id: selectedObjectId });
  }
});

socket.on("simulation_toggled", function(data) {
  console.log("Simulation mode:", data.enabled ? "ON" : "OFF");
});

socket.on("simulated_object_added", function(data) {
  if (data.success) {
    simulatedObjects[data.obj_id] = {
      label: data.label,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height
    };
    renderSimulatedObjectsList();
    showNotification(`Added simulated ${data.label}`);
    
    selectedObjectId = data.obj_id;
    setTimeout(() => {
      const item = document.querySelector(`[data-obj-id="${data.obj_id}"]`);
      if (item) item.classList.add("selected");
    }, 100);
  }
});

socket.on("simulated_object_updated", function(data) {
  if (data.success) {
    socket.emit("get_simulated_objects");
  }
});

socket.on("simulated_object_removed", function(data) {
  if (data.success) {
    delete simulatedObjects[data.obj_id];
    if (selectedObjectId === data.obj_id) {
      selectedObjectId = null;
    }
    renderSimulatedObjectsList();
    showNotification("Simulated object removed");
  }
});

socket.on("simulated_object_moved", function(data) {
  if (data.success && simulatedObjects[data.obj_id]) {
    simulatedObjects[data.obj_id].x = data.x;
    simulatedObjects[data.obj_id].y = data.y;
    renderSimulatedObjectsList();
  }
});

socket.on("simulated_object_moved_to_zone", function(data) {
  if (data.success) {
    showNotification("Object moved to counting zone! 🎯");
    if (simulatedObjects[data.obj_id]) {
      simulatedObjects[data.obj_id].x = data.x;
      simulatedObjects[data.obj_id].y = data.y;
      renderSimulatedObjectsList();
    }
  }
});

socket.on("simulated_objects_list", function(data) {
  simulatedObjects = data;
  renderSimulatedObjectsList();
});

socket.on("config_updated", function(data) {
  showNotification("Configuration updated successfully");
});

socket.on("config_applied", function(data) {
  showNotification("Configuration applied to detection system");
});

document.addEventListener("DOMContentLoaded", function() {
  socket.emit("get_simulated_objects");
  loadConfig();
  initConfigTabs();
  initConfigControls();
});