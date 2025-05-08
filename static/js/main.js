const socket = io();
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const zoneStartSlider = document.getElementById("zoneStartSlider");
const zoneWidthSlider = document.getElementById("zoneWidthSlider");
const zoneStartValue = document.getElementById("zoneStartValue");
const zoneWidthValue = document.getElementById("zoneWidthValue");
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

let currentTotal = 0;
let products = {};
let currentEditingProduct = null;
let transactions = [];
let currentTransaction = null;
let deleteItemInfo = null;

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

startBtn.addEventListener("click", function () {
  socket.emit("start_scanning", {
    zone_start: parseInt(zoneStartSlider.value),
    zone_width: parseInt(zoneWidthSlider.value),
  });

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

zoneStartSlider.oninput = function () {
  zoneStartValue.innerText = this.value;
  socket.emit("update_zone", {
    zone_start: parseInt(this.value),
    zone_width: parseInt(zoneWidthSlider.value),
  });
};

zoneWidthSlider.oninput = function () {
  zoneWidthValue.innerText = this.value;
  socket.emit("update_zone", {
    zone_start: parseInt(zoneStartSlider.value),
    zone_width: parseInt(this.value),
  });
};

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
});