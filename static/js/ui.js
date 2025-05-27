const closeModal = document.querySelector(".close-modal");
const productClose = document.querySelector(".product-close");
const historyClose = document.querySelector(".history-close");
const detailClose = document.querySelector(".detail-close");
const notification = document.getElementById("notification");
const notificationText = document.getElementById("notificationText");
const checkoutSuccess = document.getElementById("checkoutSuccess");
const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const confirmDeleteText = document.getElementById("confirmDeleteText");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

const floatingSimulationWindow = document.getElementById("floatingSimulationWindow");
const floatingConfigWindow = document.getElementById("floatingConfigWindow");
const floatingBackdrop = document.getElementById("floatingBackdrop");
const windowHeader = document.getElementById("windowHeader");
const configWindowHeader = document.getElementById("configWindowHeader");
const closeFloatingWindow = document.getElementById("closeFloatingWindow");
const closeConfigWindow = document.getElementById("closeConfigWindow");

const tabs = document.querySelectorAll(".tab");
const productsTab = document.getElementById("productsTab");
const addProductTab = document.getElementById("addProductTab");

let windowStates = {
  simulation: { active: false, position: { x: 20, y: 20 } },
  config: { active: false, position: { x: 20, y: 20 } }
};

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let windowStartX = 0;
let windowStartY = 0;
let currentDragWindow = null;

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

function hideAllFloatingWindows() {
  windowStates.simulation.active = false;
  windowStates.config.active = false;
  
  floatingBackdrop.classList.remove('active');
  floatingSimulationWindow.classList.remove('active');
  floatingConfigWindow.classList.remove('active');
  
  document.body.classList.remove('no-select');
}

function showFloatingWindow(windowType) {
  if (windowType === 'simulation' && windowStates.config.active) {
    hideFloatingWindow('config');
  } else if (windowType === 'config' && windowStates.simulation.active) {
    hideFloatingWindow('simulation');
  }
  
  windowStates[windowType].active = true;
  floatingBackdrop.classList.add('active');
  
  if (windowType === 'simulation') {
    floatingSimulationWindow.classList.add('active');
    const pos = windowStates.simulation.position;
    setWindowPosition(pos.x, pos.y, 'simulation');
  } else if (windowType === 'config') {
    floatingConfigWindow.classList.add('active');
    const pos = windowStates.config.position;
    setWindowPosition(pos.x, pos.y, 'config');
    
    setTimeout(() => {
      const configElements = floatingConfigWindow.querySelectorAll('input, select, button, .config-tab');
      configElements.forEach(el => {
        el.style.pointerEvents = 'auto';
      });
    }, 100);
  }
}

function hideFloatingWindow(windowType) {
  windowStates[windowType].active = false;
  
  if (windowType === 'simulation') {
    floatingSimulationWindow.classList.remove('active');
    if (typeof window.handleSimulationClose === 'function') {
      window.handleSimulationClose();
    }
  } else if (windowType === 'config') {
    floatingConfigWindow.classList.remove('active');
  }
  
  const anyWindowActive = Object.values(windowStates).some(state => state.active);
  if (!anyWindowActive) {
    floatingBackdrop.classList.remove('active');
    document.body.classList.remove('no-select');
  }
}

function startDragging(e, windowType) {
  if (e.target.closest('.window-btn') || 
      e.target.tagName === 'INPUT' || 
      e.target.tagName === 'SELECT' || 
      e.target.tagName === 'BUTTON') {
    return;
  }
  
  if (!e.target.closest('.window-header')) {
    return;
  }
  
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
  
  e.preventDefault();
  
  const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
  const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
  
  const deltaX = clientX - dragStartX;
  const deltaY = clientY - dragStartY;
  
  const newX = windowStartX + deltaX;
  const newY = windowStartY + deltaY;
  
  setWindowPosition(newX, newY, currentDragWindow);
}

function stopDragging() {
  if (!isDragging || !currentDragWindow) return;
  
  const window = currentDragWindow === 'simulation' ? floatingSimulationWindow : floatingConfigWindow;
  const rect = window.getBoundingClientRect();
  
  windowStates[currentDragWindow].position.x = rect.left;
  windowStates[currentDragWindow].position.y = rect.top;
  
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

function initFloatingWindows() {
  windowHeader.addEventListener('mousedown', (e) => startDragging(e, 'simulation'));
  configWindowHeader.addEventListener('mousedown', (e) => startDragging(e, 'config'));
  
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDragging);
  
  windowHeader.addEventListener('touchstart', (e) => handleTouchStart(e, 'simulation'), { passive: false });
  configWindowHeader.addEventListener('touchstart', (e) => handleTouchStart(e, 'config'), { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
  
  closeFloatingWindow.addEventListener('click', (e) => {
    e.stopPropagation();
    hideFloatingWindow('simulation');
  });
  
  closeConfigWindow.addEventListener('click', (e) => {
    e.stopPropagation();
    hideFloatingWindow('config');
  });
  
  floatingBackdrop.addEventListener('click', (e) => {
    if (e.target === floatingBackdrop) {
      hideAllFloatingWindows();
    }
  });
  
  floatingSimulationWindow.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  floatingConfigWindow.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  const configTabs = document.querySelectorAll('.config-tab');
  configTabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.stopPropagation();
      
      configTabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.config-tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      this.classList.add('active');
      const tabName = this.getAttribute('data-config-tab');
      const content = document.getElementById(tabName + 'ConfigTab');
      if (content) {
        content.classList.add('active');
      }
    });
  });
}

function initTabs() {
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
}

closeModal.addEventListener("click", function() {
  checkoutModal.style.display = "none";
});

productClose.addEventListener("click", function() {
  productModal.style.display = "none";
  hideEditForm();
});

historyClose.addEventListener("click", function() {
  historyModal.style.display = "none";
});

detailClose.addEventListener("click", function() {
  transactionDetailModal.style.display = "none";
  currentTransaction = null;
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
});

window.addEventListener("resize", function() {
  if (windowStates.simulation.active) {
    const rect = floatingSimulationWindow.getBoundingClientRect();
    setWindowPosition(rect.left, rect.top, 'simulation');
  }
  if (windowStates.config.active) {
    const rect = floatingConfigWindow.getBoundingClientRect();
    setWindowPosition(rect.left, rect.top, 'config');
  }
});

document.addEventListener("DOMContentLoaded", function() {
  initFloatingWindows();
  initTabs();
});

window.showFloatingWindow = showFloatingWindow;
window.hideFloatingWindow = hideFloatingWindow;