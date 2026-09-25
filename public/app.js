let menu = { products: [], toppings: [], sauces: [], categories: [] };
let orders = [];
let selectedProductIndex = null;
let productChosenByUser = false;
let selectedCategoryName = "Papas y comidas";
let selectedToppings = [];
let selectedSauces = [];
let itemQty = 1;
let cart = [];
let delivery = "Envío a domicilio";
let availableImages = [];

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error("Error");
  return res.json();
}

async function loadMenu() {
  menu = await api("/api/menu");

  try {
    orders = await api("/api/orders");
  } catch(e) {
    orders = [];
  }

  try {
    availableImages = await api("/api/images");
  } catch(e) {
    availableImages = [];
  }

  resetSelections();
  render();
  renderProductImageSelector();
}

function renderProductImageSelector() {
  const selector = get("newProductImage");
  const preview = get("newProductImagePreview");

  if (!selector || !availableImages.length) return;

  const previousValue = selector.value;

  selector.innerHTML = availableImages.map(img => {
    const imagePath = typeof img === "string" ? img : img.path;
    const imageName = typeof img === "string"
      ? img.replace(/^img\//, "")
      : (img.name || imagePath.replace(/^img\//, ""));

    return `<option value="${imagePath}">${imageName}</option>`;
  }).join("");

  if (availableImages.some(img => (typeof img === "string" ? img : img.path) === previousValue)) {
    selector.value = previousValue;
  }

  if (preview && selector.value) {
    preview.src = selector.value;
  }

  selector.onchange = function() {
    if (preview) preview.src = this.value;
  };
}

function money(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR");
}

function get(id) {
  return document.getElementById(id);
}

function val(id) {
  return get(id).value.trim();
}

function activeProducts() {
  return menu.products.filter(p => p.active);
}

function activeToppings() {
  return menu.toppings.filter(t => t.active);
}

function activeSauces() {
  return menu.sauces.filter(s => s.active);
}

function activeCategories() {
  return (menu.categories || []).filter(c => c.active !== false);
}

function categoryName(id) {
  const c = (menu.categories || []).find(x => Number(x.id) === Number(id));
  return c ? c.name : "Papas y comidas";
}

function currentProduct() {
  const arr = activeProducts();
  if (selectedProductIndex === null || !arr[selectedProductIndex]) return null;
  return arr[selectedProductIndex];
}

function resetSelections() {
  selectedToppings = [];
  selectedSauces = [];
  itemQty = 1;
}

function selectProduct(i) {
  selectedProductIndex = i;
  productChosenByUser = true;
  resetSelections();
  render();

  const customize = get("customize");
  if (customize && customize.style.display !== "none") {
    customize.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function scrollToCategory(categoryNameToFind) {
  const category = activeCategories().find(c =>
    String(c.name || "").trim().toLowerCase() ===
    String(categoryNameToFind || "").trim().toLowerCase()
  );

  if (!category) return;

  selectedCategoryName = category.name;
  productChosenByUser = false;
  selectedProductIndex = null;
  resetSelections();

  const customize = get("customize");
  if (customize) customize.style.display = "none";

  render();

  const grid = get("productsGrid");
  if (grid) {
    grid.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function toggle(type, name) {
  const arr = type === "topping" ? selectedToppings : selectedSauces;
  const idx = arr.indexOf(name);

  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(name);
  }

  render();
}

function changeQty(n) {
  itemQty = Math.max(1, itemQty + n);
  render();
}

function addToCart() {
  const p = currentProduct();
  if (!p) return;

  cart.push({
    productId: p.id,
    product: p.name,
    detail: p.detail || "",
    quantity: itemQty,
    unitPrice: p.price,
    total: p.price * itemQty,
    mode: p.mode,
    toppings:
      p.mode === "toppings"
        ? selectedToppings.slice()
        : [],
    sauces:
      p.mode === "directo"
        ? []
        : selectedSauces.slice()
  });

  resetSelections();
  render();
  alert("Producto agregado al carrito");
}

function removeCartItem(i) {
  cart.splice(i, 1);
  render();
}

function cartTotal() {
  return cart.reduce((s, i) => s + Number(i.total || 0), 0);
}

function openCart() {
  get("cartDrawer").classList.add("active");
  render();
}

function closeCart() {
  get("cartDrawer").classList.remove("active");
}

function setDelivery(v, btn) {
  delivery = v;

  document
    .querySelectorAll(".delivery button")
    .forEach(b => b.classList.remove("active"));

  btn.classList.add("active");
  render();
}

function showAdmin(id, btn) {
  document
    .querySelectorAll(".admin-section")
    .forEach(x => x.classList.remove("active"));

  get(id).classList.add("active");

  document
    .querySelectorAll(".admin-tabs button")
    .forEach(x => x.classList.remove("active"));

  btn.classList.add("active");
}

function requestAdminAccess() {
  get("adminLoginDrawer").classList.add("active");
}

function closeAdminLogin() {
  get("adminLoginDrawer").classList.remove("active");
}

async function loginAdmin() {
  try {
    const res = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password: val("adminPassword")
      })
    });

    if (res.ok) {
      sessionStorage.setItem("simoneAdmin", "1");
      closeAdminLogin();
      showAdminPage();
    }
  } catch(e) {
    get("adminLoginError").textContent = "Contraseña incorrecta";
  }
}

function showAdminPage() {
  get("clientePage").classList.remove("active");
  get("adminPage").classList.add("active");
  history.replaceState(null, "", "/admin");
  render();
}

function logoutAdmin() {
  sessionStorage.removeItem("simoneAdmin");
  get("adminPage").classList.remove("active");
  get("clientePage").classList.add("active");
  history.replaceState(null, "", "/");
}

function checkAdminRoute() {
  if (location.pathname === "/admin") {
    if (sessionStorage.getItem("simoneAdmin") === "1") {
      showAdminPage();
    } else {
      requestAdminAccess();
    }
  }
}

function render() {
  const p = currentProduct();

  const products = activeProducts();
  const toppings = activeToppings();
  const sauces = activeSauces();

  const categories = activeCategories();
  let selectedCategory = categories.find(c =>
    String(c.name || "").trim().toLowerCase() ===
    String(selectedCategoryName || "").trim().toLowerCase()
  );

  if (!selectedCategory && categories.length) {
    selectedCategory = categories[0];
    selectedCategoryName = selectedCategory.name;
  }

  if (selectedCategory) {
    const items = products
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => Number(x.categoryId || 1) === Number(selectedCategory.id));

    get("productsGrid").innerHTML = `
      <div id="categoria-${selectedCategory.id}" class="product-category-section" style="grid-column:1/-1;width:100%;scroll-margin-top:90px;">
        <h2 style="margin:22px 0 14px;">${selectedCategory.name}</h2>
      </div>
      ${items.map(({ x, i }) => `
        <div
          class="card ${i === selectedProductIndex ? "active" : ""}"
          onclick="selectProduct(${i})"
        >
          ${i === selectedProductIndex ? '<span class="check">✓</span>' : ""}
          <img src="${x.image}" alt="${x.name}">
          <div class="body">
            <h3>${x.name}</h3>
            <div class="price">${money(x.price)}</div>
          </div>
        </div>
      `).join("")}
    `;
  } else {
    get("productsGrid").innerHTML = "";
  }

  const customize = get("customize");

  if (!productChosenByUser || !p) {
    if (customize) customize.style.display = "none";
  } else {
    if (customize) customize.style.display = "block";

    get("selectedImage").src = p.image;
    get("selectedName").textContent = p.name;
    get("selectedPrice").textContent = money(p.price);
    get("qtyText").textContent = itemQty;

    /*
      MODOS:
      toppings     = toppings + salsas
      solo_salsas  = solamente salsas
      directo      = sin toppings ni salsas
    */

    const toppingsBlock = get("toppingsBlock");
    const saucesBlock = get("saucesBlock");

    if (p.mode === "toppings") {
      toppingsBlock.style.display = "block";
      saucesBlock.style.display = "block";
    } else if (p.mode === "solo_salsas") {
      toppingsBlock.style.display = "none";
      saucesBlock.style.display = "block";
    } else {
      toppingsBlock.style.display = "none";
      saucesBlock.style.display = "none";
    }
  }

  get("cartCount").textContent =
    cart.reduce((s, i) => s + Number(i.quantity), 0);

  get("toppingsGrid").innerHTML = toppings.map(t => `
    <div
      class="card topping-card ${selectedToppings.includes(t.name) ? "active" : ""}"
      onclick="toggle('topping','${t.name}')"
    >
      ${selectedToppings.includes(t.name) ? '<span class="check">✓</span>' : ""}
      <img src="${t.image}" alt="${t.name}">
      <div class="body">
        <h3>${t.name}</h3>
      </div>
    </div>
  `).join("");

  get("saucesGrid").innerHTML = sauces.map(s => `
    <div
      class="card topping-card ${selectedSauces.includes(s.name) ? "active" : ""}"
      onclick="toggle('sauce','${s.name}')"
    >
      ${selectedSauces.includes(s.name) ? '<span class="check">✓</span>' : ""}
      <img src="${s.image}" alt="${s.name}">
      <div class="body">
        <h3>${s.name}</h3>
      </div>
    </div>
  `).join("");

  renderCart();
  renderAdmin();
  renderOrders();
}

function renderCart() {
  const fullCart = cart.length
    ? cart.map((item, i) => `
      <div class="cart-item">

        <h3>${item.quantity} x ${item.product}</h3>

        ${item.detail
          ? `<p>${item.detail}</p>`
          : ""
        }

        ${item.toppings.length
          ? `<p><b>Toppings:</b> ${item.toppings.join(", ")}</p>`
          : ""
        }

        ${item.mode !== "directo"
          ? `<p><b>Salsas:</b> ${item.sauces.join(", ") || "Sin salsas"}</p>`
          : ""
        }

        <p><b>Subtotal:</b> ${money(item.total)}</p>

        <button
          class="remove"
          onclick="removeCartItem(${i})"
        >
          Eliminar
        </button>

      </div>
    `).join("")
    : '<div class="cart-item"><p>El carrito está vacío.</p></div>';

  get("cartItems").innerHTML = fullCart;
  get("cartTotal").textContent = money(cartTotal());

  const sideCount = get("sideCartCount");
  if (sideCount) {
    sideCount.textContent =
      cart.reduce((s, i) => s + Number(i.quantity), 0);
  }

  const sideTotal = get("sideCartTotal");
  if (sideTotal) {
    sideTotal.textContent = money(cartTotal());
  }

  const sideItems = get("sideCartItems");

  if (sideItems) {
    sideItems.innerHTML = cart.length
      ? cart.map(item => `
        <div class="side-cart-item">

          <h3>${item.quantity} x ${item.product}</h3>

          ${item.mode !== "directo"
            ? `<p>${item.sauces.join(", ") || "Sin salsas"}</p>`
            : ""
          }

          <p><b>${money(item.total)}</b></p>

        </div>
      `).join("")
      : '<div class="side-cart-item"><p>Aún no agregaste productos.</p></div>';
  }

  const whatsappButton =
    document.querySelector(".send-whatsapp-btn");

  if (whatsappButton) {
    whatsappButton.style.display =
      cart.length > 0 ? "block" : "none";
  }

  get("cashWith").style.display =
    get("payment").value === "Efectivo"
      ? "block"
      : "none";
}

async function sendOrder() {
  if (cart.length === 0) {
    return alert("Agregá productos al carrito");
  }

  const name = val("name") || "Sin completar";
  const phone = val("phone") || "Sin completar";
  const address = val("address") || "Sin completar";
  const neighborhood = val("neighborhood") || "Sin completar";
  const reference = val("reference") || "Sin referencia";
  const notes = val("notes") || "Sin aclaraciones";
  const payment = get("payment").value;
  const cashWith = val("cashWith");

  const order = {
    customer: {
      name,
      phone,
      address,
      neighborhood,
      reference
    },
    items: cart.slice(),
    total: cartTotal(),
    notes,
    delivery,
    payment,
    cashWith
  };

  let msg = "🍟 NUEVO PEDIDO SIMONE%0A%0A";

  msg +=
    `Cliente: ${name}%0A` +
    `Teléfono: ${phone}%0A%0A` +
    `PEDIDO:%0A`;

  cart.forEach((it, idx) => {

    msg +=
      `${idx + 1}) ${it.quantity} x ${it.product} - ${money(it.unitPrice)} c/u%0A`;

    if (it.detail) {
      msg += `Detalle: ${it.detail}%0A`;
    }

    if (it.toppings.length) {
      msg +=
        `Toppings: ${it.toppings.join(", ")}%0A`;
    }

    if (it.mode !== "directo") {
      msg +=
        `Salsas: ${it.sauces.join(", ") || "Sin salsas"}%0A`;
    }

    msg +=
      `Subtotal: ${money(it.total)}%0A%0A`;
  });

  msg +=
    `Aclaraciones: ${notes}%0A%0A` +
    `ENTREGA:%0A` +
    `Modalidad: ${delivery}%0A` +
    `Dirección: ${
      delivery === "Envío a domicilio"
        ? address
        : "Retira por Madariaga 809"
    }%0A`;

  if (delivery === "Envío a domicilio") {
    msg += `Barrio: ${neighborhood}%0A`;
  }

  msg +=
    `Referencia: ${reference}%0A%0A` +
    `PAGO:%0A` +
    `Forma de pago: ${payment}%0A`;

  if (payment === "Transferencia") {
    msg +=
      "Alias: lili.curuzu.colon%0A" +
      "Titular: Sogaray Lilian Ines%0A";
  }

  if (payment === "Efectivo" && cashWith) {
    msg += `Paga con: ${cashWith}%0A`;
  }

  msg +=
    `%0AEnvío: Según distancia%0A` +
    `TOTAL APROXIMADO: ${money(cartTotal())}`;

  const res = await api("/api/orders", {
    method: "POST",
    body: JSON.stringify(order)
  });

  await loadMenu();

  window.open(
    "https://wa.me/5493772584075?text=" + msg,
    "_blank"
  );

  alert("Pedido guardado como #" + res.id);

  cart = [];
  closeCart();
  render();
}

function renderAdmin() {
  if (!get("adminProducts")) return;

  const newProductCategory = get("newProductCategory");
  if (newProductCategory) {
    const previousCategory = newProductCategory.value;
    newProductCategory.innerHTML = (menu.categories || []).filter(c => c.active !== false).map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join("");
    if ([...newProductCategory.options].some(o => o.value === previousCategory)) {
      newProductCategory.value = previousCategory;
    }
  }

  get("adminProducts").innerHTML =
    menu.products.map(p => `
      <div class="admin-row">

        <input
          value="${p.name}"
          onchange="updateProduct(${p.id},{name:this.value})"
        >

        <input
          type="number"
          value="${p.price}"
          onchange="updateProduct(${p.id},{price:Number(this.value)})"
        >

        <select onchange="updateProduct(${p.id},{categoryId:Number(this.value)})">
          ${(menu.categories || []).map(c => `
            <option value="${c.id}" ${Number(p.categoryId || 1) === Number(c.id) ? "selected" : ""}>${c.name}</option>
          `).join("")}
        </select>

        <select onchange="updateProduct(${p.id},{mode:this.value})">
          <option value="toppings" ${p.mode === "toppings" ? "selected" : ""}>Toppings + Salsas</option>
          <option value="solo_salsas" ${p.mode === "solo_salsas" ? "selected" : ""}>Solo Salsas</option>
          <option value="directo" ${p.mode === "directo" ? "selected" : ""}>Sin personalización</option>
        </select>

        <button
          class="switch ${p.active ? "" : "off"}"
          onclick="updateProduct(${p.id},{active:${!p.active}})"
        >
          ${p.active ? "Activo" : "Pausado"}
        </button>

      </div>
    `).join("");

  get("adminToppings").innerHTML =
    menu.toppings.map(t => `
      <div class="admin-row two">

        <input
          value="${t.name}"
          onchange="updateTopping(${t.id},{name:this.value})"
        >

        <button
          class="switch ${t.active ? "" : "off"}"
          onclick="updateTopping(${t.id},{active:${!t.active}})"
        >
          ${t.active ? "Activo" : "Pausado"}
        </button>

      </div>
    `).join("");

  const adminCategories = get("adminCategories");
  if (adminCategories) {
    adminCategories.innerHTML = (menu.categories || []).map(c => `
      <div class="admin-row two">
        <input value="${c.name}" onchange="updateCategory(${c.id},{name:this.value})">
        <button class="switch ${c.active === false ? "off" : ""}" onclick="updateCategory(${c.id},{active:${c.active === false ? "true" : "false"}})">
          ${c.active === false ? "Pausada" : "Activa"}
        </button>
      </div>
    `).join("");
  }

  get("adminSauces").innerHTML =
    menu.sauces.map(s => `
      <div class="admin-row two">

        <input
          value="${s.name}"
          onchange="updateSauce(${s.id},{name:this.value})"
        >

        <button
          class="switch ${s.active ? "" : "off"}"
          onclick="updateSauce(${s.id},{active:${!s.active}})"
        >
          ${s.active ? "Activo" : "Pausado"}
        </button>

      </div>
    `).join("");
}

function renderOrders() {
  if (!get("ordersList")) return;

  const today =
    new Date().toISOString().slice(0, 10);

  const todayOrders =
    (orders || []).filter(
      o => (o.createdAt || "").slice(0, 10) === today
    );

  const sales =
    todayOrders.reduce(
      (s, o) => s + Number(o.total || 0),
      0
    );

  get("salesToday").textContent =
    money(sales);

  get("ordersToday").textContent =
    todayOrders.length;

  get("avgTicket").textContent =
    money(
      todayOrders.length
        ? Math.round(sales / todayOrders.length)
        : 0
    );

  get("pendingOrders").textContent =
    (orders || []).filter(
      o => o.status === "Pendiente"
    ).length;

  get("ordersList").innerHTML =
    orders.length
      ? orders.map(o => `
        <div class="order-card">

          <h3>
            Pedido #${o.id} - ${o.status}
          </h3>

          <p>
            <b>Cliente:</b>
            ${o.customer?.name || ""}
          </p>

          <p>
            <b>Tel:</b>
            ${o.customer?.phone || ""}
          </p>

          <p>
            <b>Items:</b>
            ${(o.items || [])
              .map(i => `${i.quantity} x ${i.product}`)
              .join(" / ")}
          </p>

          <p>
            <b>Total:</b>
            ${money(o.total)}
          </p>

          <div class="order-actions">

            <select
              onchange="updateOrderStatus(${o.id},this.value)"
            >

              <option
                ${o.status === "Pendiente" ? "selected" : ""}
              >
                Pendiente
              </option>

              <option
                ${o.status === "Preparando" ? "selected" : ""}
              >
                Preparando
              </option>

              <option
                ${o.status === "Listo" ? "selected" : ""}
              >
                Listo
              </option>

              <option
                ${o.status === "Entregado" ? "selected" : ""}
              >
                Entregado
              </option>

            </select>

            <button
              class="btn"
              onclick="printOrder(${o.id})"
            >
              Imprimir
            </button>

          </div>

        </div>
      `).join("")
      : '<div class="order-card"><p>Todavía no hay pedidos.</p></div>';
}

async function updateProduct(id, data) {
  await api("/api/products/" + id, {
    method: "PATCH",
    body: JSON.stringify(data)
  });

  await loadMenu();
}

async function updateTopping(id, data) {
  await api("/api/toppings/" + id, {
    method: "PATCH",
    body: JSON.stringify(data)
  });

  await loadMenu();
}

async function updateSauce(id, data) {
  await api("/api/sauces/" + id, {
    method: "PATCH",
    body: JSON.stringify(data)
  });

  await loadMenu();
}


/* ==========================================
   AGREGAR PRODUCTO
   AHORA GUARDA:
   nombre
   precio
   descripción
   modo
   imagen
========================================== */

async function addProduct() {

  const name =
    val("newProductName");

  const price =
    Number(val("newProductPrice"));

  const detail =
    val("newProductDetail");

  const mode =
    get("newProductMode").value;

  const image =
    get("newProductImage").value;

  const categoryId = get("newProductCategory")
    ? Number(get("newProductCategory").value)
    : 1;

  if (!name || !price) {
    return alert("Completá nombre y precio");
  }

  await api("/api/products", {
    method: "POST",
    body: JSON.stringify({
      name,
      price,
      detail,
      mode,
      image,
      categoryId
    })
  });

  get("newProductName").value = "";
  get("newProductPrice").value = "";
  get("newProductDetail").value = "";

  await loadMenu();

  alert("Producto agregado correctamente");
}

async function updateCategory(id, data) {
  await api("/api/categories/" + id, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
  await loadMenu();
}

async function addCategory() {
  const input = get("newCategoryName");
  const name = input ? input.value.trim() : "";
  if (!name) return alert("Escribí el nombre de la categoría");

  await api("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name })
  });

  input.value = "";
  await loadMenu();
  alert("Categoría agregada correctamente");
}

async function addTopping() {
  const name = val("newToppingName");

  if (!name) return;

  await api("/api/toppings", {
    method: "POST",
    body: JSON.stringify({ name })
  });

  await loadMenu();
}

async function addSauce() {
  const name = val("newSauceName");

  if (!name) return;

  await api("/api/sauces", {
    method: "POST",
    body: JSON.stringify({ name })
  });

  await loadMenu();
}

async function updateOrderStatus(id, status) {
  await api("/api/orders/" + id, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

  await loadMenu();
}

function printOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;

  const items = (o.items || []).map(it => `
    <div class="item">
      <div class="item-title">${it.quantity} x ${it.product}</div>
      ${it.detail ? `<div>${it.detail}</div>` : ""}
      ${it.toppings?.length ? `<div><b>Toppings:</b> ${it.toppings.join(", ")}</div>` : ""}
      ${it.mode !== "directo" ? `<div><b>Salsas:</b> ${(it.sauces || []).join(", ") || "Sin salsas"}</div>` : ""}
      <div><b>Subtotal:</b> ${money(it.total)}</div>
    </div>
  `).join("");

  const cashLine = o.payment === "Efectivo" && o.cashWith
    ? `<div><b>Paga con:</b> ${o.cashWith}</div>` : "";

  const notesLine = o.notes && o.notes !== "Sin aclaraciones"
    ? `<div class="important"><b>Aclaraciones:</b> ${o.notes}</div>` : "";

  const ticket = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Pedido #${o.id}</title>
<style>
  @page { size: 80mm 297mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; width: 80mm; background: #fff; color: #000;
    font-family: Arial, Helvetica, sans-serif;
  }
  body { padding: 4mm 4mm 3mm 4mm; }
  .ticket { width: 72mm; margin: 0; padding: 0; font-size: 12px; line-height: 1.28; }
  .center { text-align: center; }
  .title { font-size: 18px; font-weight: 800; margin: 0 0 2px; }
  .order-number { font-size: 17px; font-weight: 800; margin: 4px 0 2px; }
  .separator { border-top: 1px dashed #000; margin: 7px 0; }
  .item { padding: 4px 0 6px; border-bottom: 1px dashed #000; }
  .item-title { font-size: 14px; font-weight: 800; margin-bottom: 2px; }
  .total { font-size: 18px; font-weight: 900; margin: 7px 0 4px; }
  .important { margin-top: 5px; font-size: 13px; }
  .footer { text-align: center; margin-top: 8px; font-weight: 700; }
</style>
</head>
<body>
  <div class="ticket">
    <div class="center">
      <div class="title">SIMONE PAPAS FRITAS</div>
      <div>Madariaga 809</div>
      <div class="order-number">PEDIDO #${o.id}</div>
      <div>${new Date(o.createdAt).toLocaleString("es-AR")}</div>
    </div>
    <div class="separator"></div>
    <div><b>Cliente:</b> ${o.customer?.name || ""}</div>
    <div><b>Tel:</b> ${o.customer?.phone || ""}</div>
    <div><b>Entrega:</b> ${o.delivery || ""}</div>
    ${o.delivery === "Envío a domicilio" ? `
      <div><b>Dirección:</b> ${o.customer?.address || ""}</div>
      <div><b>Barrio:</b> ${o.customer?.neighborhood || ""}</div>` : ""}
    <div><b>Referencia:</b> ${o.customer?.reference || ""}</div>
    <div class="separator"></div>
    ${items}
    ${notesLine}
    <div class="separator"></div>
    <div><b>Pago:</b> ${o.payment || ""}</div>
    ${cashLine}
    <div><b>Envío:</b> Según distancia</div>
    <div class="total">TOTAL: ${money(o.total)}</div>
    <div class="separator"></div>
    <div class="footer">Gracias por tu compra</div>
  </div>
<script>
window.onload=function(){setTimeout(function(){window.print();},250);};
<\/script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=420,height=700");
  if (!printWindow) {
    alert("El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes para Simone.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(ticket);
  printWindow.document.close();
}

[
  "name",
  "phone",
  "address",
  "neighborhood",
  "reference",
  "notes",
  "cashWith",
  "payment"
].forEach(id => {

  const el = get(id);

  if (el) {
    el.addEventListener(
      "input",
      render
    );
  }

});

loadMenu().then(() => {
  lastMenuSnapshot = JSON.stringify(menu);
  checkAdminRoute();
});

/* ==========================================
   ACTUALIZACION AUTOMATICA DEL MENU
   - Consulta cambios cada 60 segundos
   - No recarga la pagina
   - Conserva carrito y seleccion del cliente
========================================== */

let lastMenuSnapshot = "";

async function refreshMenuAutomatically() {
  try {
    const freshMenu = await api("/api/menu");
    const freshSnapshot = JSON.stringify(freshMenu);

    if (!lastMenuSnapshot) {
      lastMenuSnapshot = JSON.stringify(menu);
    }

    if (freshSnapshot !== lastMenuSnapshot) {
      const currentId = currentProduct() ? currentProduct().id : null;

      menu = freshMenu;
      lastMenuSnapshot = freshSnapshot;

      const products = activeProducts();
      const sameIndex = products.findIndex(p => p.id === currentId);

      if (sameIndex >= 0) {
        selectedProductIndex = sameIndex;
      } else {
        selectedProductIndex = null;
        productChosenByUser = false;
      }

      render();
    }
  } catch (e) {
    // Si momentaneamente no hay conexion, conserva la pantalla actual.
  }
}

setInterval(refreshMenuAutomatically, 60000);
