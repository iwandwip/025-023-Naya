const socket = io();
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const statusText = document.getElementById("statusText");
const loadingElement = document.querySelector(".loading");
const checkoutBtn = document.getElementById("checkoutBtn");
const checkoutModal = document.getElementById("checkoutModal");
const closeModal = document.querySelector(".close-modal");
const finishBtn = document.getElementById("finishBtn");
const modalTotal = document.getElementById("modalTotal");
const notification = document.getElementById("notification");
const notificationText = document.getElementById("notificationText");
const checkoutSuccess = document.getElementById("checkoutSuccess");

const adminButton = document.getElementById("adminButton");
const productModal = document.getElementById("productModal");
const productClose = document.querySelector(".product-close");
const tabs = document.querySelectorAll(".tab");
const productsTab = document.getElementById("productsTab");
const addProductTab = document.getElementById("addProductTab");
const productsTableBody = document.getElementById("productsTableBody");
const addProductBtn = document.getElementById("addProductBtn");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");

const editProductForm = document.getElementById("editProductForm");
const editProductName = document.getElementById("editProductName");
const editProductPrice = document.getElementById("editProductPrice");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const historyButton = document.getElementById("historyButton");
const historyModal = document.getElementById("historyModal");
const historyClose = document.querySelector(".history-close");
const filterHistoryBtn = document.getElementById("filterHistoryBtn");
const resetHistoryBtn = document.getElementById("resetHistoryBtn");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const totalTransactions = document.getElementById("totalTransactions");
const totalRevenue = document.getElementById("totalRevenue");
const transactionsTableBody = document.getElementById("transactionsTableBody");

const transactionDetailModal = document.getElementById("transactionDetailModal");
const detailClose = document.querySelector(".detail-close");
const detailTransactionId = document.getElementById("detailTransactionId");
const detailTransactionDate = document.getElementById("detailTransactionDate");
const detailItemsTableBody = document.getElementById("detailItemsTableBody");
const detailTotal = document.getElementById("detailTotal");
const deleteTransactionBtn = document.getElementById("deleteTransactionBtn");

const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const confirmDeleteText = document.getElementById("confirmDeleteText");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

const simulationToggle = document.getElementById("simulationToggle");
const simulationStatus = document.getElementById("simulationStatus");
const floatingSimulationWindow = document.getElementById("floatingSimulationWindow");
const floatingBackdrop = document.getElementById("floatingBackdrop");
const windowHeader = document.getElementById("windowHeader");
const closeFloatingWindow = document.getElementById("closeFloatingWindow");
const addSimObjectBtn = document.getElementById("addSimObjectBtn");
const simulatedObjectsList = document.getElementById("simulatedObjectsList");
const testCountingBtn = document.getElementById("testCountingBtn");
const clearSimObjectsBtn = document.getElementById("clearSimObjectsBtn");

const configButton = document.getElementById("configButton");
const floatingConfigWindow = document.getElementById("floatingConfigWindow");
const configWindowHeader = document.getElementById("configWindowHeader");
const closeConfigWindow = document.getElementById("closeConfigWindow");
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

let currentTotal = 0;
let products = {};
let currentEditingProduct = null;
let transactions = [];
let currentTransaction = null;
let deleteItemInfo = null;
let isSimulationMode = false;
let simulatedObjects = {};
let selectedObjectId = null;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let windowStartX = 0;
let windowStartY = 0;
let windowPosition = { x: 20, y: 20 };
let configWindowPosition = { x: 20, y: 20 };
let isDraggingConfig = false;
let currentDragWindow = null;

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

function showNotification(message) {
  notificationText.textContent = message;
  notification.classList.add("show");
  notification.style.display = "block";
  
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.style.display = "none";
    }, 300);
  }, 3000);
}

function showCheckoutSuccess() {
  checkoutSuccess.style.display = "flex";
  setTimeout(() => {
    checkoutSuccess.classList.add("show");
  }, 10);
  
  setTimeout(() => {
    checkoutSuccess.classList.remove("show");
    setTimeout(() => {
      checkoutSuccess.style.display = "none";
    }, 300);
  }, 3000);
}

function showConfirmDelete(type, name, callback) {
  if (type === 'item') {
    confirmDeleteText.textContent = `Are you sure you want to remove "${name}" from your cart?`;
  } else if (type === 'transaction') {
    confirmDeleteText.textContent = `Are you sure you want to delete this transaction? This action cannot be undone.`;
  }
  
  confirmDeleteModal.style.display = "block";
  
  confirmDeleteBtn.onclick = () => {
    confirmDeleteModal.style.display = "none";
    callback();
  };
}

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

function initFloatingWindows() {
  windowHeader.addEventListener('mousedown', (e) => startDragging(e, 'simulation'));
  configWindowHeader.addEventListener('mousedown', (e) => startDragging(e, 'config'));
  
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDragging);
  
  windowHeader.addEventListener('touchstart', (e) => handleTouchStart(e, 'simulation'), { passive: false });
  configWindowHeader.addEventListener('touchstart', (e) => handleTouchStart(e, 'config'), { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
  
  closeFloatingWindow.addEventListener('click', hideFloatingWindow);
  closeConfigWindow.addEventListener('click', hideConfigWindow);
  
  setWindowPosition(windowPosition.x, windowPosition.y, 'simulation');
  setWindowPosition(configWindowPosition.x, configWindowPosition.y, 'config');
}

function startDragging(e, windowType) {
  isDragging = true;
  currentDragWindow = windowType;
  dragStartX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
  dragStartY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
  
  const window = windowType === 'simulation' ? floatingSimulationWindow : floatingConfigWindow;
  const rect = window.getBoundingClientRect();
  windowStartX = rect.left;
  windowStartY = rect.top;
  
  window.classList.add('dragging');
  document.body.classList.add('no-select');
  
  e.preventDefault();
}

function doDrag(e) {
  if (!isDragging || !currentDragWindow) return;
  
  const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
  const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
  
  const deltaX = clientX - dragStartX;
  const deltaY = clientY - dragStartY;
  
  const newX = windowStartX + deltaX;
  const newY = windowStartY + deltaY;
  
  setWindowPosition(newX, newY, currentDragWindow);
  e.preventDefault();
}

function stopDragging() {
  if (!isDragging || !currentDragWindow) return;
  
  const window = currentDragWindow === 'simulation' ? floatingSimulationWindow : floatingConfigWindow;
  const rect = window.getBoundingClientRect();
  
  if (currentDragWindow === 'simulation') {
    windowPosition.x = rect.left;
    windowPosition.y = rect.top;
  } else {
    configWindowPosition.x = rect.left;
    configWindowPosition.y = rect.top;
  }
  
  isDragging = false;
  currentDragWindow = null;
  window.classList.remove('dragging');
  document.body.classList.remove('no-select');
}

function handleTouchStart(e, windowType) {
  startDragging(e, windowType);
}

function handleTouchMove(e) {
  doDrag(e);
}

function handleTouchEnd(e) {
  stopDragging();
}

function setWindowPosition(x, y, windowType) {
  const window = windowType === 'simulation' ? floatingSimulationWindow : floatingConfigWindow;
  const windowRect = window.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const minX = 10;
  const minY = 10;
  const maxX = viewportWidth - windowRect.width - 10;
  const maxY = viewportHeight - windowRect.height - 10;
  
  const clampedX = Math.max(minX, Math.min(maxX, x));
  const clampedY = Math.max(minY, Math.min(maxY, y));
  
  window.style.left = clampedX + 'px';
  window.style.top = clampedY + 'px';
  window.style.right = 'auto';
}

function showFloatingWindow() {
  floatingBackdrop.classList.add('active');
  floatingSimulationWindow.classList.add('active');
  
  const viewportWidth = window.innerWidth;
  const defaultX = Math.max(20, viewportWidth - 400);
  setWindowPosition(windowPosition.x || defaultX, windowPosition.y || 20, 'simulation');
}

function hideFloatingWindow() {
  floatingBackdrop.classList.remove('active');
  floatingSimulationWindow.classList.remove('active');
  
  simulationToggle.checked = false;
  isSimulationMode = false;
  simulationStatus.textContent = "Real Detection Mode";
  simulationStatus.style.color = "#27ae60";
  
  socket.emit("toggle_simulation", { enabled: false });
}

function showConfigWindow() {
  floatingBackdrop.classList.add('active');
  floatingConfigWindow.classList.add('active');
  
  const viewportWidth = window.innerWidth;
  const defaultX = Math.max(20, viewportWidth - 470);
  setWindowPosition(configWindowPosition.x || defaultX, configWindowPosition.y || 20, 'config');
}

function hideConfigWindow() {
  floatingBackdrop.classList.remove('active');
  floatingConfigWindow.classList.remove('active');
}

function initConfigTabs() {
  configTabs.forEach(tab => {
    tab.addEventListener('click', function() {
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

  saveConfigBtn.addEventListener('click', saveConfig);
  resetConfigBtn.addEventListener('click', resetConfig);
  applyConfigBtn.addEventListener('click', function() {
    socket.emit('apply_full_config', currentConfig);
    showNotification("Configuration applied successfully");
  });
}

startBtn.addEventListener("click", function () {
  socket.emit("start_scanning", currentConfig.detection);
  startBtn.disabled = true;
  stopBtn.disabled = false;
  loadingElement.style.display = "block";
  statusText.style.display = "none";
});

stopBtn.addEventListener("click", function () {
  socket.emit("stop_scanning");
  startBtn.disabled = false;
  stopBtn.disabled = true;
  loadingElement.style.display = "none";
  statusText.style.display = "block";
  statusText.innerText = "Scanning complete";
});

configButton.addEventListener("click", function() {
  showConfigWindow();
});

simulationToggle.addEventListener("change", function() {
  isSimulationMode = this.checked;
  
  socket.emit("toggle_simulation", {
    enabled: isSimulationMode
  });
  
  if (isSimulationMode) {
    showFloatingWindow();
    simulationStatus.textContent = "🎮 Simulation Mode";
    simulationStatus.style.color = "#e74c3c";
    showNotification("Simulation mode enabled");
  } else {
    hideFloatingWindow();
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

socket.on("cart_update", function (data) {
  updateCart(data.cart, data.total);
});

socket.on("scanning_complete", function (data) {
  updateCart(data.cart, data.total);
  startBtn.disabled = false;
  stopBtn.disabled = true;
  loadingElement.style.display = "none";
  statusText.style.display = "block";
  statusText.innerText = "Scanning complete";
});

function updateCart(cart, total) {
  const oldProducts = {};
  const cartItems = cartList.querySelectorAll(".cart-item");
  cartItems.forEach(item => {
    const productName = item.getAttribute("data-product");
    if (productName) {
      oldProducts[productName] = true;
    }
  });
  
  cartList.innerHTML = "";
  currentTotal = total;

  if (Object.keys(cart).length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "cart-item";
    emptyItem.innerText = "Your cart is empty";
    cartList.appendChild(emptyItem);
    checkoutBtn.disabled = true;
  } else {
    for (const [product, details] of Object.entries(cart)) {
      const item = document.createElement("li");
      item.className = "cart-item";
      item.setAttribute("data-product", product);
      
      if (!oldProducts[product]) {
        setTimeout(() => {
          item.classList.add("adding");
          showNotification(`${product} added to cart`);
        }, 10);
      }
      
      const itemInfo = document.createElement("div");
      itemInfo.className = "cart-item-info";
      const subtotal = details.price * details.quantity;
      itemInfo.innerText = `${product} x${details.quantity} - Rp ${details.price.toLocaleString()} each = Rp ${subtotal.toLocaleString()}`;
      
      const deleteBtn = document.createElement("span");
      deleteBtn.className = "cart-item-delete";
      deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
      deleteBtn.addEventListener("click", function() {
        showConfirmDelete('item', product, () => {
          socket.emit("remove_item", {
            name: product
          });
        });
      });
      
      item.appendChild(itemInfo);
      item.appendChild(deleteBtn);
      cartList.appendChild(item);
    }
    checkoutBtn.disabled = false;
  }

  cartTotal.innerText = `Total: Rp ${total.toLocaleString()}`;
}

checkoutBtn.addEventListener("click", function() {
  openCheckoutModal(currentTotal);
});

closeModal.addEventListener("click", function() {
  checkoutModal.style.display = "none";
});

finishBtn.addEventListener("click", function() {
  checkoutModal.style.display = "none";
  socket.emit("checkout_complete");
  
  showCheckoutSuccess();
  
  updateCart({}, 0);
  statusText.innerText = "Payment completed. Ready to scan";
});

cancelDeleteBtn.addEventListener("click", function() {
  confirmDeleteModal.style.display = "none";
});

window.addEventListener("click", function(event) {
  if (event.target === checkoutModal) {
    checkoutModal.style.display = "none";
  }
  if (event.target === productModal) {
    productModal.style.display = "none";
  }
  if (event.target === historyModal) {
    historyModal.style.display = "none";
  }
  if (event.target === transactionDetailModal) {
    transactionDetailModal.style.display = "none";
  }
  if (event.target === confirmDeleteModal) {
    confirmDeleteModal.style.display = "none";
  }
  if (event.target === checkoutSuccess) {
    checkoutSuccess.style.display = "none";
  }
  if (event.target === floatingBackdrop) {
    hideFloatingWindow();
    hideConfigWindow();
  }
});

window.addEventListener("resize", function() {
  if (isSimulationMode) {
    const rect = floatingSimulationWindow.getBoundingClientRect();
    setWindowPosition(rect.left, rect.top, 'simulation');
  }
  if (floatingConfigWindow.classList.contains('active')) {
    const rect = floatingConfigWindow.getBoundingClientRect();
    setWindowPosition(rect.left, rect.top, 'config');
  }
});

function openCheckoutModal(total) {
  if (total <= 0) return;
  
  modalTotal.innerText = `Total: Rp ${total.toLocaleString()}`;
  
  const qrContainer = document.getElementById("qrCode");
  qrContainer.innerHTML = "";
  
  new QRCode(qrContainer, {
    text: `TOTAL:${total}`,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
  
  checkoutModal.style.display = "block";
}

adminButton.addEventListener("click", function() {
  socket.emit("get_products");
  productModal.style.display = "block";
});

productClose.addEventListener("click", function() {
  productModal.style.display = "none";
  hideEditForm();
});

tabs.forEach(tab => {
  tab.addEventListener("click", function() {
    tabs.forEach(t => t.classList.remove("active"));
    this.classList.add("active");
    
    const tabName = this.getAttribute("data-tab");
    if (tabName === "products") {
      productsTab.style.display = "block";
      addProductTab.style.display = "none";
      hideEditForm();
    } else if (tabName === "add") {
      productsTab.style.display = "none";
      addProductTab.style.display = "block";
      hideEditForm();
    }
  });
});

addProductBtn.addEventListener("click", function() {
  const name = productName.value.trim();
  const price = parseInt(productPrice.value);
  
  if (!name || !price || price <= 0) {
    alert("Please enter valid product name and price");
    return;
  }
  
  socket.emit("add_product", {
    name: name,
    price: price
  });
  
  productName.value = "";
  productPrice.value = "";
});

saveEditBtn.addEventListener("click", function() {
  const price = parseInt(editProductPrice.value);
  
  if (!price || price <= 0) {
    alert("Please enter a valid price");
    return;
  }
  
  socket.emit("update_product", {
    name: currentEditingProduct,
    price: price
  });
  
  hideEditForm();
});

cancelEditBtn.addEventListener("click", function() {
  hideEditForm();
});

function showEditForm(productName, productPrice) {
  currentEditingProduct = productName;
  editProductName.value = productName;
  editProductPrice.value = productPrice;
  
  productsTab.style.display = "none";
  addProductTab.style.display = "none";
  editProductForm.style.display = "block";
}

function hideEditForm() {
  editProductForm.style.display = "none";
  if (document.querySelector(".tab.active").getAttribute("data-tab") === "products") {
    productsTab.style.display = "block";
  } else {
    addProductTab.style.display = "block";
  }
  currentEditingProduct = null;
}

function renderProductsTable() {
  productsTableBody.innerHTML = "";
  
  if (Object.keys(products).length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 3;
    emptyCell.textContent = "No products found";
    emptyCell.style.textAlign = "center";
    emptyRow.appendChild(emptyCell);
    productsTableBody.appendChild(emptyRow);
    return;
  }
  
  for (const [name, price] of Object.entries(products)) {
    const row = document.createElement("tr");
    
    const nameCell = document.createElement("td");
    nameCell.textContent = name;
    
    const priceCell = document.createElement("td");
    priceCell.textContent = `Rp ${price.toLocaleString()}`;
    
    const actionsCell = document.createElement("td");
    
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-edit";
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    editBtn.addEventListener("click", function() {
      showEditForm(name, price);
    });
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-delete";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.addEventListener("click", function() {
      showConfirmDelete('item', name, () => {
        socket.emit("delete_product", { name: name });
      });
    });
    
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);
    
    row.appendChild(nameCell);
    row.appendChild(priceCell);
    row.appendChild(actionsCell);
    
    productsTableBody.appendChild(row);
  }
}

historyButton.addEventListener("click", function() {
  socket.emit("get_transaction_history");
  historyModal.style.display = "block";
});

historyClose.addEventListener("click", function() {
  historyModal.style.display = "none";
});

filterHistoryBtn.addEventListener("click", function() {
  const start = startDate.value;
  const end = endDate.value;
  
  if (!start || !end) {
    alert("Please select both start and end dates");
    return;
  }
  
  socket.emit("get_transactions_by_date", {
    start_date: start,
    end_date: end
  });
});

resetHistoryBtn.addEventListener("click", function() {
  startDate.value = "";
  endDate.value = "";
  socket.emit("get_transaction_history");
});

deleteTransactionBtn.addEventListener("click", function() {
  if (!currentTransaction) return;
  
  showConfirmDelete('transaction', '', () => {
    socket.emit("delete_transaction", { id: currentTransaction.id });
    transactionDetailModal.style.display = "none";
    
    const index = transactions.findIndex(t => t.id === currentTransaction.id);
    if (index !== -1) {
      transactions.splice(index, 1);
      renderTransactionsTable();
    }
  });
});

function renderTransactionsTable() {
  transactionsTableBody.innerHTML = "";
  
  if (transactions.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 4;
    emptyCell.textContent = "No transactions found";
    emptyCell.style.textAlign = "center";
    emptyRow.appendChild(emptyCell);
    transactionsTableBody.appendChild(emptyRow);
    
    totalTransactions.textContent = "0";
    totalRevenue.textContent = "Rp 0";
    return;
  }
  
  let totalRev = 0;
  
  transactions.forEach(transaction => {
    const row = document.createElement("tr");
    
    const dateCell = document.createElement("td");
    dateCell.textContent = transaction.formatted_date || "N/A";
    
    const itemsCell = document.createElement("td");
    const itemsCount = transaction.items ? transaction.items.length : 0;
    itemsCell.textContent = `${itemsCount} item${itemsCount !== 1 ? 's' : ''}`;
    
    const totalCell = document.createElement("td");
    totalCell.textContent = `Rp ${transaction.total.toLocaleString()}`;
    
    const actionsCell = document.createElement("td");
    
    const viewBtn = document.createElement("button");
    viewBtn.className = "btn btn-view";
    viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
    viewBtn.addEventListener("click", function() {
      showTransactionDetail(transaction);
    });
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-delete";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener("click", function() {
      showConfirmDelete('transaction', '', () => {
        socket.emit("delete_transaction", { id: transaction.id });
        
        const index = transactions.findIndex(t => t.id === transaction.id);
        if (index !== -1) {
          transactions.splice(index, 1);
          renderTransactionsTable();
        }
      });
    });
    
    actionsCell.appendChild(viewBtn);
    actionsCell.appendChild(deleteBtn);
    
    row.appendChild(dateCell);
    row.appendChild(itemsCell);
    row.appendChild(totalCell);
    row.appendChild(actionsCell);
    
    transactionsTableBody.appendChild(row);
    
    totalRev += transaction.total;
  });
  
  totalTransactions.textContent = transactions.length;
  totalRevenue.textContent = `Rp ${totalRev.toLocaleString()}`;
}

function showTransactionDetail(transaction) {
  currentTransaction = transaction;
  detailTransactionId.textContent = transaction.id;
  detailTransactionDate.textContent = transaction.formatted_date || "N/A";
  
  detailItemsTableBody.innerHTML = "";
  
  if (!transaction.items || transaction.items.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 4;
    emptyCell.textContent = "No items in this transaction";
    emptyCell.style.textAlign = "center";
    emptyRow.appendChild(emptyCell);
    detailItemsTableBody.appendChild(emptyRow);
  } else {
    transaction.items.forEach(item => {
      const row = document.createElement("tr");
      
      const nameCell = document.createElement("td");
      nameCell.textContent = item.name;
      
      const priceCell = document.createElement("td");
      priceCell.textContent = item.price.toLocaleString();
      
      const quantityCell = document.createElement("td");
      quantityCell.textContent = item.quantity;
      
      const subtotalCell = document.createElement("td");
      subtotalCell.textContent = item.subtotal.toLocaleString();
      
      row.appendChild(nameCell);
      row.appendChild(priceCell);
      row.appendChild(quantityCell);
      row.appendChild(subtotalCell);
      
      detailItemsTableBody.appendChild(row);
    });
  }
  
  detailTotal.textContent = `Total: Rp ${transaction.total.toLocaleString()}`;
  
  transactionDetailModal.style.display = "block";
}

detailClose.addEventListener("click", function() {
  transactionDetailModal.style.display = "none";
  currentTransaction = null;
});

socket.on("item_removed", function(data) {
  if (data.success) {
    showNotification(`Removed ${data.name} from cart`);
  }
});

socket.on("products_list", function(data) {
  products = data;
  renderProductsTable();
});

socket.on("product_added", function(data) {
  products[data.name] = data.price;
  renderProductsTable();
  showNotification(`Product ${data.name} added successfully`);
  
  const productsTab = document.querySelector('.tab[data-tab="products"]');
  productsTab.click();
});

socket.on("product_updated", function(data) {
  products[data.name] = data.price;
  renderProductsTable();
  showNotification(`Product ${data.name} updated successfully`);
});

socket.on("product_deleted", function(data) {
  delete products[data.name];
  renderProductsTable();
  showNotification(`Product ${data.name} deleted successfully`);
});

socket.on("transaction_history", function(data) {
  transactions = data;
  renderTransactionsTable();
});

socket.on("transaction_deleted", function(data) {
  if (data.success) {
    showNotification("Transaction deleted successfully");
  }
});

socket.on("connect", function() {
  console.log("Connected to server");
});

socket.on("disconnect", function() {
  console.log("Disconnected from server");
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

function setDefaultDates() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  startDate.value = formatDate(thirtyDaysAgo);
  endDate.value = formatDate(today);
}

document.addEventListener("DOMContentLoaded", function() {
  setDefaultDates();
  socket.emit("get_simulated_objects");
  loadConfig();
  initFloatingWindows();
  initConfigTabs();
  initConfigControls();
});