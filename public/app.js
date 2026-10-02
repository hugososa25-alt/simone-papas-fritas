let menu = { products: [], toppings: [], sauces: [], categories: [] };
let orders = [];
let selectedProductIndex = null;
let productChosenByUser = false;
let selectedCategoryName = "Papas y comidas";
let selectedToppings = [];
let selectedSauces = [];
let itemQty = 1;
let cart = [];
let paymentReceiptData = "";
let paymentReceiptName = "";

try {
  const savedCart = JSON.parse(sessionStorage.getItem("simoneCart") || "[]");
  if (Array.isArray(savedCart)) cart = savedCart;
} catch(e) {}
let delivery = "Envío a domicilio";
let tableNumber = null;
let tableReservationToken = sessionStorage.getItem("simoneTableReservationToken") || "";
let availableImages = [];

function ensureTableReservationToken() {
  if (!tableReservationToken) {
    tableReservationToken = "mesa_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
    sessionStorage.setItem("simoneTableReservationToken", tableReservationToken);
  }
  return tableReservationToken;
}

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
  return menu.products.filter(p => {
    if (!p.active) return false;
    const publication = p.publication || "both";
    if (tableNumber !== null) return publication !== "takeaway";
    return publication !== "table";
  });
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
    image: p.image || "",
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
  showCartToast("✅ Agregado al carrito");
}

function showCartToast(message) {
  let toast = document.getElementById("cartToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cartToast";
    toast.style.cssText = "position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:90;background:#19b83e;color:white;padding:12px 18px;border-radius:999px;font-weight:900;box-shadow:0 8px 25px rgba(0,0,0,.45);";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = "block";
  clearTimeout(window.__simoneToastTimer);
  window.__simoneToastTimer = setTimeout(() => toast.style.display = "none", 1800);
}

async function handlePaymentReceipt(input) {
  const file = input && input.files ? input.files[0] : null;
  const status = get("paymentReceiptStatus");
  if (!file) {
    paymentReceiptData = "";
    paymentReceiptName = "";
    if (status) { status.textContent = "Todavía no adjuntaste un comprobante."; status.classList.remove("ready"); }
    return;
  }
  if (!file.type.startsWith("image/")) {
    input.value = "";
    return alert("El comprobante debe ser una imagen.");
  }
  if (status) { status.textContent = "Preparando comprobante..."; status.classList.remove("ready"); }
  try {
    paymentReceiptData = await compressReceiptImage(file);
    paymentReceiptName = file.name || "comprobante.jpg";
    if (status) { status.textContent = "✅ Comprobante adjuntado: " + paymentReceiptName; status.classList.add("ready"); }
  } catch(e) {
    paymentReceiptData = "";
    paymentReceiptName = "";
    input.value = "";
    if (status) status.textContent = "No se pudo cargar el comprobante.";
    alert("No se pudo preparar el comprobante. Probá con otra imagen.");
  }
}

function compressReceiptImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
  if (!history.state || history.state.simoneView !== "cart") {
    history.pushState({ simoneView: "cart" }, "", location.href);
  }
  render();
}

function closeCart(fromPopState = false) {
  get("cartDrawer").classList.remove("active");
  if (!fromPopState && history.state && history.state.simoneView === "cart") {
    history.back();
  }
}

function activateTableMode(n) {
  tableNumber = n;
  delivery = "Consumo en mesa";

  const btn = get("tableDeliveryButton");
  if (btn) {
    btn.style.display = "block";
    document.querySelectorAll(".delivery button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  const notice = get("tableOrderNotice");
  if (notice) {
    notice.style.display = "block";
    notice.textContent = `🪑 Consumo en mesa — Mesa ${tableNumber}`;
  }

  render();
}

async function detectTableFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("mesa");
  const n = Number(raw);

  // Mantiene compatibilidad con los QR/enlaces individuales existentes.
  if (Number.isInteger(n) && n >= 1 && n <= 15) {
    activateTableMode(n);
    return;
  }

  // QR unico: https://simonepf.com.ar/?mesa=seleccionar
  if (String(raw || "").toLowerCase() === "seleccionar") {
    await showTableSelector();
  }
}

function ensureTableSelectorStyles() {
  if (get("simoneTableSelectorStyles")) return;
  const style = document.createElement("style");
  style.id = "simoneTableSelectorStyles";
  style.textContent = `
    .mesa-selector-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px}
    .mesa-selector-box{width:min(620px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:22px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.35);color:#171717}
    .mesa-selector-box h2{margin:0 0 6px;font-size:27px;text-align:center}
    .mesa-selector-box .intro{text-align:center;color:#666;margin:0 0 18px}
    .mesa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
    .mesa-choice{border:2px solid #dedede;border-radius:15px;padding:16px 8px;background:#fff;font-weight:900;font-size:17px;cursor:pointer;min-height:72px}
    .mesa-choice.available{border-color:#79bd8f;background:#eef9f1;color:#176b37}
    .mesa-choice.busy{border-color:#efb1b1;background:#fff0f0;color:#b42c2c;cursor:not-allowed;opacity:.78}
    .mesa-refresh{width:100%;margin-top:15px;border:0;border-radius:12px;padding:13px;background:#f6c900;color:#111;font-weight:900;cursor:pointer}
    .mesa-loading{text-align:center;padding:25px 5px;font-weight:800;color:#666}
    @media(max-width:480px){.mesa-grid{grid-template-columns:repeat(3,1fr)}.mesa-selector-box{padding:17px}.mesa-choice{font-size:15px;padding:13px 5px}}
  `;
  document.head.appendChild(style);
}

async function showTableSelector() {
  ensureTableSelectorStyles();

  let overlay = get("simoneTableSelector");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "simoneTableSelector";
    overlay.className = "mesa-selector-overlay";
    document.body.appendChild(overlay);
  }

  overlay.style.display = "flex";
  overlay.innerHTML = `
    <div class="mesa-selector-box">
      <h2>🪑 Elegí tu mesa</h2>
      <p class="intro">Seleccioná la mesa donde estás sentado.</p>
      <div class="mesa-loading">Consultando mesas disponibles...</div>
    </div>`;

  try {
    const tables = await api("/api/tables/availability?token=" + encodeURIComponent(ensureTableReservationToken()));
    const availableCount = tables.filter(t => t.available).length;

    overlay.innerHTML = `
      <div class="mesa-selector-box">
        <h2>🪑 Elegí tu mesa</h2>
        <p class="intro">${availableCount} mesa${availableCount === 1 ? "" : "s"} disponible${availableCount === 1 ? "" : "s"}. Las ocupadas no se pueden seleccionar.</p>
        <div class="mesa-grid">
          ${tables.map(t => `
            <button class="mesa-choice ${t.available ? "available" : "busy"}"
              ${t.available ? `onclick="chooseAvailableTable(${t.tableNumber})"` : "disabled"}>
              Mesa ${t.tableNumber}<br><small>${t.available ? "● Disponible" : "● Ocupada"}</small>
            </button>
          `).join("")}
        </div>
        <button class="mesa-refresh" onclick="showTableSelector()">↻ ACTUALIZAR MESAS</button>
      </div>`;
  } catch (e) {
    overlay.innerHTML = `
      <div class="mesa-selector-box">
        <h2>🪑 Elegí tu mesa</h2>
        <p class="intro">No pudimos consultar las mesas en este momento.</p>
        <button class="mesa-refresh" onclick="showTableSelector()">REINTENTAR</button>
      </div>`;
  }
}

async function chooseAvailableTable(n) {
  n = Number(n);
  if (!Number.isInteger(n) || n < 1 || n > 15) return;

  const token = ensureTableReservationToken();

  try {
    const res = await fetch(`/api/tables/${n}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "La mesa acaba de ser ocupada. Elegí otra mesa.");
      await showTableSelector();
      return;
    }

    activateTableMode(n);
    const overlay = get("simoneTableSelector");
    if (overlay) overlay.style.display = "none";
    history.replaceState(null, "", `/?mesa=${n}`);
  } catch (e) {
    alert("No se pudo reservar la mesa. Intentá nuevamente.");
    await showTableSelector();
  }
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



/* ==========================================
   MIS SIMONES - CLIENTE Y ADMINISTRADOR
========================================== */
let loyaltyPhone = sessionStorage.getItem("simoneLoyaltyPhone") || "";
let loyaltyData = null;

function normalizeSimonePhone(value) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("54")) phone = phone.slice(2);
  if (phone.startsWith("0")) phone = phone.slice(1);
  if (phone.startsWith("15")) phone = phone.slice(2);
  return phone;
}

function validSimonePhone(value) {
  return /^3772\d{6}$/.test(normalizeSimonePhone(value));
}

function ensureLoyaltyStyles() {
  if (get("simoneLoyaltyStyles")) return;
  const style = document.createElement("style");
  style.id = "simoneLoyaltyStyles";
  style.textContent = `
    .simones-promo{margin:16px auto 20px;max-width:980px;background:linear-gradient(135deg,#fff4b8,#ffd52d);color:#171717;border:2px solid #111;border-radius:20px;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,.15)}
    .simones-promo h2{margin:0 0 6px;font-size:26px}.simones-promo p{margin:5px 0}.simones-btn{border:0;border-radius:12px;background:#111;color:#fff;font-weight:900;padding:12px 18px;cursor:pointer;margin-top:10px}
    .simones-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}.simones-box{width:min(620px,100%);max-height:90vh;overflow:auto;background:#fff;color:#171717;border-radius:22px;padding:20px}.simones-close{float:right;border:0;background:#eee;border-radius:999px;width:36px;height:36px;font-size:20px;cursor:pointer}.simones-balance{font-size:42px;font-weight:1000;text-align:center;margin:12px 0}.simones-reward{border:1px solid #ddd;border-radius:14px;padding:12px;margin:10px 0}.simones-reward.available{border:2px solid #20a64a;background:#effbf2}.simones-history{border-top:1px solid #ddd;padding:9px 0}.simones-phone{width:100%;padding:12px;border:1px solid #bbb;border-radius:10px;font-size:17px}.simones-admin{margin-top:24px;padding:16px;border:2px solid #f0c400;border-radius:16px;background:#fffdf2}.simones-admin-row{display:grid;grid-template-columns:90px 1fr 1fr auto;gap:8px;align-items:center;margin:9px 0}.simones-admin-row input,.simones-admin-row select{padding:9px;border:1px solid #bbb;border-radius:8px}.simones-admin-row button{padding:9px;border:0;border-radius:8px;font-weight:800;cursor:pointer}@media(max-width:620px){.simones-admin-row{grid-template-columns:1fr}.simones-balance{font-size:36px}}
  `;
  document.head.appendChild(style);
}

function ensureLoyaltyPromo() {
  ensureLoyaltyStyles();
  if (get("simonesPromo")) return;
  const productsGrid = get("productsGrid");
  if (!productsGrid || !productsGrid.parentNode) return;
  const card = document.createElement("div");
  card.id = "simonesPromo";
  card.className = "simones-promo";
  card.innerHTML = `<h2>⭐ JUNTÁ SIMONES</h2><p><b>Sumá 1 Simone por compra</b> de Papas y comidas.</p><p>Canjeá tus Simones por premios y seguí acumulando.</p><button class="simones-btn" onclick="openMisSimones()">VER MIS SIMONES</button>`;
  productsGrid.parentNode.insertBefore(card, productsGrid);
}

async function openMisSimones() {
  ensureLoyaltyStyles();
  let overlay = get("misSimonesOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "misSimonesOverlay";
    overlay.className = "simones-overlay";
    document.body.appendChild(overlay);
  }
  overlay.style.display = "flex";
  overlay.innerHTML = `<div class="simones-box"><button class="simones-close" onclick="closeMisSimones()">×</button><h2>⭐ Mis Simones</h2><p>Ingresá tu celular para consultar tu saldo.</p><label><b>Celular (sin 0 y sin 15)</b></label><input id="simonesPhoneInput" class="simones-phone" inputmode="numeric" maxlength="10" placeholder="3772XXXXXX" value="${loyaltyPhone}"><button class="simones-btn" style="width:100%" onclick="loadMisSimones()">VER MIS SIMONES</button><div id="simonesContent"></div></div>`;
  if (loyaltyPhone) await loadMisSimones();
}

function closeMisSimones() {
  const overlay = get("misSimonesOverlay");
  if (overlay) overlay.style.display = "none";
}

async function loadMisSimones() {
  const input = get("simonesPhoneInput");
  const phone = normalizeSimonePhone(input ? input.value : loyaltyPhone);
  const content = get("simonesContent");
  if (!validSimonePhone(phone)) {
    if (content) content.innerHTML = `<p style="color:#b00020;font-weight:800">Ingresá un celular válido: 3772XXXXXX.</p>`;
    return;
  }
  loyaltyPhone = phone;
  sessionStorage.setItem("simoneLoyaltyPhone", phone);
  if (input) input.value = phone;
  try {
    loyaltyData = await api("/api/loyalty/" + encodeURIComponent(phone));
    renderMisSimones();
  } catch(e) {
    if (content) content.innerHTML = `<p>No se pudo consultar Mis Simones en este momento.</p>`;
  }
}

function renderMisSimones() {
  const content = get("simonesContent");
  if (!content || !loyaltyData) return;
  const balance = Number(loyaltyData.balance || 0);
  const rewards = Array.isArray(loyaltyData.rewards) ? loyaltyData.rewards.slice().sort((a,b)=>Number(a.simones)-Number(b.simones)) : [];
  const history = Array.isArray(loyaltyData.history) ? loyaltyData.history : [];
  content.innerHTML = `
    <div class="simones-balance">${balance} <span style="font-size:20px">Simone${balance === 1 ? "" : "s"}</span></div>
    <h3>🎁 Premios</h3>
    ${rewards.length ? rewards.map(r => { const ok = balance >= Number(r.simones); return `<div class="simones-reward ${ok ? "available" : ""}"><b>${Number(r.simones)} Simones → ${r.label}</b><br><small>${ok ? "✅ Premio disponible" : `Te faltan ${Math.max(0, Number(r.simones)-balance)} Simone(s)`}</small>${ok ? `<br><button class="simones-btn" onclick="redeemSimones(${r.id})">CANJEAR</button>` : ""}</div>`; }).join("") : "<p>No hay premios activos.</p>"}
    <h3>📋 Historial</h3>
    ${history.length ? history.map(h => `<div class="simones-history"><b>${new Date(h.createdAt).toLocaleDateString("es-AR")}</b> · ${h.type === "redeem" ? (h.reward || "Canje") : `${h.source || "Compra"}${h.orderId ? ` – Pedido #${h.orderId}` : ""}`}<br><b>${Number(h.amount) > 0 ? "+" : ""}${h.amount} Simone${Math.abs(Number(h.amount)) === 1 ? "" : "s"}</b> · Saldo ${h.balance}</div>`).join("") : "<p>Todavía no tenés movimientos.</p>"}
  `;
}

async function redeemSimones(rewardId) {
  if (!loyaltyPhone || !loyaltyData) return;
  const reward = (loyaltyData.rewards || []).find(r => Number(r.id) === Number(rewardId));
  if (!reward) return;
  if (!confirm(`¿Canjear ${reward.simones} Simones por ${reward.label}?`)) return;
  try {
    const result = await api(`/api/loyalty/${encodeURIComponent(loyaltyPhone)}/redeem`, { method:"POST", body:JSON.stringify({ rewardId:Number(rewardId) }) });
    const product = (menu.products || []).find(p => Number(p.id) === Number(result.reward.productId));
    cart.push({
      productId: Number(result.reward.productId), product: result.reward.label, image: product?.image || "", detail: "🎁 CANJE MIS SIMONES", quantity: 1, unitPrice: 0, total: 0, mode: "directo", toppings: [], sauces: [], loyaltyReward: true, rewardId: result.reward.id
    });
    loyaltyData.balance = result.balance;
    closeMisSimones();
    render();
    openCart();
    alert("Canje realizado. El premio fue agregado al carrito por $0.");
  } catch(e) {
    alert("No se pudo realizar el canje. Verificá tu saldo e intentá nuevamente.");
  }
}

async function loadAdminLoyalty() {
  const box = get("simonesAdminBox");
  if (!box) return;
  try {
    const [rewards, customers] = await Promise.all([
      api("/api/admin/loyalty/rewards"),
      api("/api/admin/loyalty/customers")
    ]);

    const customerHtml = customers.length
      ? customers.map(c => {
          const last = c.lastMovement;
          const lastText = last
            ? (last.type === "redeem"
                ? (last.reward || "Canje")
                : ((last.source || "Compra") + (last.orderId ? " · Pedido #" + last.orderId : "")))
            : "Sin movimientos";
          return `<details class="simones-reward" style="margin:10px 0">
            <summary style="cursor:pointer;list-style:none">
              <div style="display:grid;grid-template-columns:minmax(120px,1.4fr) minmax(105px,1fr) 80px;gap:8px;align-items:center">
                <div><b>${c.name || "Sin nombre"}</b><br><small>${c.phone}</small></div>
                <div><small>Ganados: ${c.earned || 0} · Canjeados: ${c.redeemed || 0}</small><br><small>${lastText}</small></div>
                <div style="text-align:right;font-size:20px;font-weight:900">⭐ ${c.balance || 0}</div>
              </div>
            </summary>
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid #ddd">
              ${(c.history || []).length
                ? c.history.slice().reverse().map(h => `<div class="simones-history"><b>${new Date(h.createdAt).toLocaleDateString("es-AR")}</b> · ${h.type === "redeem" ? (h.reward || "Canje") : ((h.source || "Compra") + (h.orderId ? " – Pedido #" + h.orderId : ""))}<br><b>${Number(h.amount)>0?"+":""}${h.amount} Simone${Math.abs(Number(h.amount))===1?"":"s"}</b> · Saldo ${h.balance}</div>`).join("")
                : "<small>Sin movimientos.</small>"}
            </div>
          </details>`;
        }).join("")
      : "<p>Todavía no hay clientes con Simones.</p>";

    box.innerHTML = `
      <h2>⭐ Programa Mis Simones</h2>
      
      <div class="simones-reward" style="margin:14px 0;padding:14px">
        <h3 style="margin-top:0">➕ Carga manual de Simones</h3>
        <p style="margin-top:-4px">Para recuperar una compra anterior o corregir un caso excepcional.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input id="manualSimoneName" placeholder="Nombre del cliente">
          <input id="manualSimonePhone" inputmode="numeric" maxlength="10" placeholder="Celular 3772XXXXXX">
          <input id="manualSimoneAmount" type="number" min="1" max="20" value="1" placeholder="Cantidad">
          <input id="manualSimoneReason" placeholder="Motivo, ej: Pedido 01/10">
        </div>
        <button class="simones-btn" style="width:100%;margin-top:10px" onclick="manualCreditSimones()">AGREGAR SIMONES</button>
      </div>

      <h3>👥 Clientes</h3>
      <p style="margin-top:-6px">Consultá quién está sumando, su saldo y sus canjes.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0">
        <div class="simones-reward" style="text-align:center"><small>Clientes</small><br><b style="font-size:22px">${customers.length}</b></div>
        <div class="simones-reward" style="text-align:center"><small>Simones activos</small><br><b style="font-size:22px">${customers.reduce((n,c)=>n+Number(c.balance||0),0)}</b></div>
        <div class="simones-reward" style="text-align:center"><small>Canjeados</small><br><b style="font-size:22px">${customers.reduce((n,c)=>n+Number(c.redeemed||0),0)}</b></div>
      </div>
      <div>${customerHtml}</div>
      <hr style="margin:22px 0">
      <h3>🎁 Premios</h3>
      <p>Configurá los premios que verá el cliente.</p>
      ${rewards.map(r => `<div class="simones-admin-row"><input type="number" min="1" value="${r.simones}" onchange="updateLoyaltyReward(${r.id},{simones:Number(this.value)})"><select onchange="updateLoyaltyReward(${r.id},{productId:Number(this.value)})">${(menu.products||[]).map(p=>`<option value="${p.id}" ${Number(p.id)===Number(r.productId)?"selected":""}>${p.name}</option>`).join("")}</select><input value="${r.label || ""}" onchange="updateLoyaltyReward(${r.id},{label:this.value})"><button onclick="updateLoyaltyReward(${r.id},{active:${r.active===false?"true":"false"}})">${r.active===false?"Pausado":"Activo"}</button></div>`).join("")}
      <hr>
      <h3>Agregar premio</h3>
      <div class="simones-admin-row"><input id="newRewardSimones" type="number" min="1" placeholder="Simones"><select id="newRewardProduct">${(menu.products||[]).map(p=>`<option value="${p.id}">${p.name}</option>`).join("")}</select><input id="newRewardLabel" placeholder="Nombre del premio"><button onclick="addLoyaltyReward()">AGREGAR</button></div>
    `;
  } catch(e) {
    box.innerHTML = "<p>No se pudo cargar el Programa Mis Simones.</p>";
  }
}

function ensureAdminLoyalty() {
  if (get("simonesAdminBox")) return;
  const adminPage = get("adminPage");
  if (!adminPage) return;
  const box = document.createElement("div");
  box.id = "simonesAdminBox";
  box.className = "simones-admin";
  adminPage.appendChild(box);
  loadAdminLoyalty();
}


async function manualCreditSimones() {
  const name = String(get("manualSimoneName")?.value || "").trim();
  const phone = normalizeSimonePhone(get("manualSimonePhone")?.value || "");
  const amount = Number(get("manualSimoneAmount")?.value || 1);
  const reason = String(get("manualSimoneReason")?.value || "").trim();

  if (!validSimonePhone(phone)) {
    return alert("Ingresá un celular válido: 3772XXXXXX.");
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > 20) {
    return alert("La cantidad debe ser entre 1 y 20 Simones.");
  }
  if (!reason) {
    return alert("Indicá el motivo de la carga manual.");
  }
  if (!confirm(`¿Agregar ${amount} Simone${amount === 1 ? "" : "s"} al celular ${phone}?`)) return;

  try {
    const result = await api("/api/admin/loyalty/manual-credit", {
      method: "POST",
      body: JSON.stringify({ name, phone, amount, reason })
    });
    alert(`Listo. Nuevo saldo: ${result.balance} Simone${Number(result.balance) === 1 ? "" : "s"}.`);
    await loadAdminLoyalty();
  } catch (e) {
    alert("No se pudo realizar la carga manual.");
  }
}

async function updateLoyaltyReward(id, data) {
  await api("/api/admin/loyalty/rewards/" + id, { method:"PATCH", body:JSON.stringify(data) });
  await loadAdminLoyalty();
}

async function addLoyaltyReward() {
  const simones = Number(get("newRewardSimones")?.value || 0);
  const productId = Number(get("newRewardProduct")?.value || 0);
  const label = String(get("newRewardLabel")?.value || "").trim();
  if (!simones || !productId) return alert("Completá cantidad de Simones y producto.");
  await api("/api/admin/loyalty/rewards", { method:"POST", body:JSON.stringify({simones,productId,label}) });
  await loadAdminLoyalty();
}

function render() {
  ensureLoyaltyPromo();
  if (get("adminPage")?.classList.contains("active")) ensureAdminLoyalty();
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

  const totalCartItems = cart.reduce((s, i) => s + Number(i.quantity), 0);
  get("cartCount").textContent = totalCartItems;
  const mobileCartBar = get("mobileCartBar");
  const mobileCartCount = get("mobileCartCount");
  const mobileCartTotal = get("mobileCartTotal");
  if (mobileCartCount) mobileCartCount.textContent = totalCartItems;
  if (mobileCartTotal) mobileCartTotal.textContent = money(cartTotal());
  if (mobileCartBar) mobileCartBar.style.display = cart.length ? "flex" : "none";
  try { sessionStorage.setItem("simoneCart", JSON.stringify(cart)); } catch(e) {}

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

  const selectedPayment = get("payment").value;

  get("cashWith").style.display =
    selectedPayment === "Efectivo"
      ? "block"
      : "none";

  const mpBox = get("mercadoPagoBox");
  const mpTotal = get("mercadoPagoTotal");
  const mpNote = get("mercadoPagoDeliveryNote");
  if (mpBox) mpBox.style.display = selectedPayment === "Mercado Pago" ? "block" : "none";
  if (mpTotal) mpTotal.textContent = `Total de productos: ${money(cartTotal())}`;
  if (mpNote) {
    mpNote.textContent = delivery === "Envío a domicilio"
      ? "El costo de envío se confirma según tu dirección y no está incluido en este total."
      : "Este es el total a abonar.";
  }

  const isTable = delivery === "Consumo en mesa";
  ["address", "neighborhood", "reference"].forEach(id => {
    const el = get(id);
    if (el) el.style.display = isTable ? "none" : "block";
  });
}


async function sendOrder() {
  if (cart.length === 0) {
    return alert("Agregá productos al carrito");
  }

  const name = val("name") || "Sin completar";
  const rawPhone = val("phone");
  const phone = normalizeSimonePhone(rawPhone);
  if (!validSimonePhone(phone)) {
    return alert("Ingresá tu celular con formato 3772XXXXXX, sin 0 y sin 15.");
  }
  const phoneInput = get("phone");
  if (phoneInput) phoneInput.value = phone;
  loyaltyPhone = phone;
  sessionStorage.setItem("simoneLoyaltyPhone", phone);
  const address = delivery === "Consumo en mesa"
    ? `Mesa ${tableNumber}`
    : (val("address") || "Sin completar");
  const neighborhood = delivery === "Consumo en mesa"
    ? "Consumo en mesa"
    : (val("neighborhood") || "Sin completar");
  const reference = val("reference") || "Sin referencia";
  const notes = val("notes") || "Sin aclaraciones";
  const payment = get("payment").value;
  const cashWith = val("cashWith");

  if (payment === "Mercado Pago" && !paymentReceiptData) {
    return alert("Adjuntá el comprobante de Mercado Pago para continuar.");
  }

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
    tableNumber: delivery === "Consumo en mesa" ? tableNumber : null,
    tableReservationToken: delivery === "Consumo en mesa" ? tableReservationToken : "",
    payment,
    cashWith,
    paymentReceipt: payment === "Mercado Pago" ? paymentReceiptData : "",
    paymentReceiptName: payment === "Mercado Pago" ? paymentReceiptName : ""
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
    `Modalidad: ${delivery}${delivery === "Consumo en mesa" ? ` - Mesa ${tableNumber}` : ""}%0A` +
    `Dirección: ${
      delivery === "Envío a domicilio"
        ? address
        : delivery === "Consumo en mesa"
          ? `Mesa ${tableNumber}`
          : "Retira por Madariaga 809"
    }%0A`;

  if (delivery === "Envío a domicilio") {
    msg += `Barrio: ${neighborhood}%0A`;
  }

  msg +=
    `Referencia: ${reference}%0A%0A` +
    `PAGO:%0A` +
    `Forma de pago: ${payment}%0A`;

  if (payment === "Mercado Pago") {
    msg += "Pago por Mercado Pago - comprobante adjuntado en Simone.%0A";
  }

  if (payment === "Efectivo" && cashWith) {
    msg += `Paga con: ${cashWith}%0A`;
  }

  msg +=
    `%0AEnvío: ${delivery === "Envío a domicilio" ? "Según dirección (no incluido)" : "No corresponde"}%0A` +
    `TOTAL PRODUCTOS: ${money(cartTotal())}`;

  const res = await api("/api/orders", {
    method: "POST",
    body: JSON.stringify(order)
  });

  await loadMenu();
  loyaltyData = null;

  if (delivery === "Consumo en mesa") {
    alert(`Pedido #${res.id} enviado. Acercate a caja para confirmar el pago. Mesa ${tableNumber}.`);
  } else {
    window.open(
      "https://wa.me/5493772584075?text=" + msg,
      "_blank"
    );
    alert("Pedido guardado como #" + res.id);
  }

  cart = [];
  paymentReceiptData = "";
  paymentReceiptName = "";
  sessionStorage.removeItem("simoneCart");
  const receiptInput = get("paymentReceipt");
  if (receiptInput) receiptInput.value = "";
  const receiptStatus = get("paymentReceiptStatus");
  if (receiptStatus) { receiptStatus.textContent = "Todavía no adjuntaste un comprobante."; receiptStatus.classList.remove("ready"); }
  closeCart();
  render();
}

function renderAdmin() {
  if (!get("adminProducts")) return;
  ensureNewProductPublicationSelector();

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

        <select onchange="updateProduct(${p.id},{publication:this.value})" title="Dónde publicar">
          <option value="both" ${(p.publication || "both") === "both" ? "selected" : ""}>Mesas + Llevar/Delivery</option>
          <option value="table" ${p.publication === "table" ? "selected" : ""}>Solo Mesas</option>
          <option value="takeaway" ${p.publication === "takeaway" ? "selected" : ""}>Solo Llevar/Delivery</option>
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

          ${typeof o.paymentReceipt === "string" && o.paymentReceipt.startsWith("data:image/") ? `
            <div style="margin:10px 0;padding:10px;border:1px solid #333;border-radius:12px;">
              <b>📎 Comprobante Mercado Pago</b><br>
              <img src="${o.paymentReceipt}" alt="Comprobante Pedido #${o.id}" style="margin-top:8px;max-width:220px;max-height:280px;object-fit:contain;border-radius:10px;cursor:pointer;" onclick="window.open(this.src,'_blank')">
            </div>` : ""}

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

function ensureNewProductPublicationSelector() {
  if (get("newProductPublication")) return;
  const mode = get("newProductMode");
  if (!mode || !mode.parentNode) return;

  const wrap = document.createElement("div");
  wrap.style.marginTop = "12px";
  wrap.innerHTML = `
    <label style="display:block;font-weight:800;margin-bottom:6px;">¿Dónde publicar?</label>
    <select id="newProductPublication" style="width:100%;padding:11px;border-radius:10px;">
      <option value="both">Mesas + Llevar/Delivery</option>
      <option value="table">Solo Mesas</option>
      <option value="takeaway">Solo Llevar/Delivery</option>
    </select>
    <small style="display:block;margin-top:5px;opacity:.75;">Si no elegís una opción especial, se publica en ambos.</small>
  `;
  mode.insertAdjacentElement("afterend", wrap);
}

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

  const publication = get("newProductPublication")
    ? get("newProductPublication").value
    : "both";

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
      categoryId,
      publication
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

// Navegación interna: el primer "Atrás" vuelve dentro de Simone antes de salir.
(function setupSimoneNavigation() {
  if (!history.state || !history.state.simoneBase) {
    history.replaceState({ simoneBase: true }, "", location.href);
    history.pushState({ simoneView: "home" }, "", location.href);
  }
  window.addEventListener("popstate", () => {
    const drawer = get("cartDrawer");
    if (drawer && drawer.classList.contains("active")) {
      closeCart(true);
    }
  });
})();

loadMenu().then(async () => {
  lastMenuSnapshot = JSON.stringify(menu);
  await detectTableFromUrl();
  render();
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
