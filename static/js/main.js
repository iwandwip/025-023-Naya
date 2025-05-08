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

let currentTotal = 0;
let products = {};
let currentEditingProduct = null;

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
      const subtotal = details.price * details.quantity;
      item.innerText = `${product} x${
        details.quantity
      } - Rp ${details.price.toLocaleString()} each = Rp ${subtotal.toLocaleString()}`;
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
  socket.emit("clear_cart");
  updateCart({}, 0);
  statusText.innerText = "Payment completed. Ready to scan";
});

window.addEventListener("click", function(event) {
  if (event.target === checkoutModal) {
    checkoutModal.style.display = "none";
  }
  if (event.target === productModal) {
    productModal.style.display = "none";
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
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function() {
      showEditForm(name, price);
    });
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function() {
      if (confirm(`Are you sure you want to delete ${name}?`)) {
        socket.emit("delete_product", { name: name });
      }
    });
    
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);
    
    row.appendChild(nameCell);
    row.appendChild(priceCell);
    row.appendChild(actionsCell);
    
    productsTableBody.appendChild(row);
  }
}

socket.on("products_list", function(data) {
  products = data;
  renderProductsTable();
});

socket.on("product_added", function(data) {
  products[data.name] = data.price;
  renderProductsTable();
  
  const productsTab = document.querySelector('.tab[data-tab="products"]');
  productsTab.click();
});

socket.on("product_updated", function(data) {
  products[data.name] = data.price;
  renderProductsTable();
});

socket.on("product_deleted", function(data) {
  delete products[data.name];
  renderProductsTable();
});

socket.on("connect", function() {
  console.log("Connected to server");
});

socket.on("disconnect", function() {
  console.log("Disconnected from server");
});