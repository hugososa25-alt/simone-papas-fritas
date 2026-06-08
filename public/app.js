let menu = { products: [], toppings: [], sauces: [] };
let orders = [];
let selectedProductIndex = null;
let selectedToppings = [];
let selectedSauces = [];
let itemQty = 1;
let cart = [];
let delivery = "Envío a domicilio";

async function api(path, options) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) throw new Error("Error");
  return res.json();
}
async function loadMenu() {
  menu = await api("/api/menu");
  try { orders = await api("/api/orders"); } catch(e) { orders = []; }
  resetSelections();
  render();
}
function money(n){return "$"+Number(n||0).toLocaleString("es-AR")}
function get(id){return document.getElementById(id)}
function val(id){return get(id).value.trim()}
function activeProducts(){return menu.products.filter(p=>p.active)}
function activeToppings(){return menu.toppings.filter(t=>t.active)}
function activeSauces(){return menu.sauces.filter(s=>s.active)}
function currentProduct(){const arr=activeProducts(); if(!arr[selectedProductIndex]) selectedProductIndex=0; return arr[selectedProductIndex]}
function resetSelections(){
  const p=currentProduct();
  selectedToppings = [];
  selectedSauces = [];
  itemQty = 1;
}
function selectProduct(i){
  selectedProductIndex=i;
  resetSelections();
  render();
  get("customize").scrollIntoView({behavior:"smooth"});
}
function toggle(type,name){
  const arr=type==="topping"?selectedToppings:selectedSauces;
  const idx=arr.indexOf(name);
  if(idx>=0) arr.splice(idx,1); else arr.push(name);
  render();
}
function changeQty(n){itemQty=Math.max(1,itemQty+n);render()}
function addToCart(){
  const p=currentProduct();
  if(!p) return;
  cart.push({
    productId:p.id,
    product:p.name,
    detail:p.detail,
    quantity:itemQty,
    unitPrice:p.price,
    total:p.price*itemQty,
    mode:p.mode,
    toppings:p.mode==="solo_salsas"?[]:selectedToppings.slice(),
    sauces:selectedSauces.slice()
  });
  resetSelections();
  render();
  alert("Producto agregado al carrito");
}
function removeCartItem(i){cart.splice(i,1);render()}
function cartTotal(){return cart.reduce((s,i)=>s+Number(i.total||0),0)}
function openCart(){get("cartDrawer").classList.add("active");render()}
function closeCart(){get("cartDrawer").classList.remove("active")}
function setDelivery(v,btn){delivery=v;document.querySelectorAll(".delivery button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");render()}
function showAdmin(id,btn){document.querySelectorAll(".admin-section").forEach(x=>x.classList.remove("active"));get(id).classList.add("active");document.querySelectorAll(".admin-tabs button").forEach(x=>x.classList.remove("active"));btn.classList.add("active")}
function requestAdminAccess(){get("adminLoginDrawer").classList.add("active")}
function closeAdminLogin(){get("adminLoginDrawer").classList.remove("active")}
async function loginAdmin(){
  try{
    const res=await api("/api/admin/login",{method:"POST",body:JSON.stringify({password:val("adminPassword")})});
    if(res.ok){sessionStorage.setItem("simoneAdmin","1");closeAdminLogin();showAdminPage();}
  }catch(e){get("adminLoginError").textContent="Contraseña incorrecta";}
}
function showAdminPage(){get("clientePage").classList.remove("active");get("adminPage").classList.add("active");history.replaceState(null,"","/admin");render()}
function logoutAdmin(){sessionStorage.removeItem("simoneAdmin");get("adminPage").classList.remove("active");get("clientePage").classList.add("active");history.replaceState(null,"","/");}
function checkAdminRoute(){if(location.pathname==="/admin"){if(sessionStorage.getItem("simoneAdmin")==="1") showAdminPage(); else requestAdminAccess();}}

function render(){
  const p=currentProduct();
  if(!p) return;
  const products=activeProducts(), toppings=activeToppings(), sauces=activeSauces();

  get("productsGrid").innerHTML=products.map((x,i)=>`
    <div class="card ${i===selectedProductIndex?'active':''}" onclick="selectProduct(${i})">
      ${i===selectedProductIndex?'<span class="check">✓</span>':''}
      <img src="${x.image}" alt="${x.name}">
      <div class="body"><h3>${x.name}</h3><div class="price">${money(x.price)}</div></div>
    </div>`).join("");

  get("selectedImage").src=p.image;
  get("selectedName").textContent=p.name;
  get("selectedPrice").textContent=money(p.price);
  get("qtyText").textContent=itemQty;
  get("cartCount").textContent=cart.reduce((s,i)=>s+Number(i.quantity),0);

  get("toppingsBlock").style.display=p.mode==="solo_salsas"?"none":"block";
  get("toppingsGrid").innerHTML=toppings.map(t=>`
    <div class="card topping-card ${selectedToppings.includes(t.name)?'active':''}" onclick="toggle('topping','${t.name}')">
      ${selectedToppings.includes(t.name)?'<span class="check">✓</span>':''}
      <img src="${t.image}" alt="${t.name}">
      <div class="body"><h3>${t.name}</h3></div>
    </div>`).join("");

  get("saucesGrid").innerHTML=sauces.map(s=>`
    <div class="card topping-card ${selectedSauces.includes(s.name)?'active':''}" onclick="toggle('sauce','${s.name}')">
      ${selectedSauces.includes(s.name)?'<span class="check">✓</span>':''}
      <img src="${s.image}" alt="${s.name}">
      <div class="body"><h3>${s.name}</h3></div>
    </div>`).join("");

  renderCart();
  renderAdmin();
  renderOrders();
}

function renderCart(){
  const fullCart = cart.length ? cart.map((item,i)=>`
    <div class="cart-item">
      <h3>${item.quantity} x ${item.product}</h3>
      <p>${item.detail}</p>
      ${item.toppings.length?`<p><b>Toppings:</b> ${item.toppings.join(", ")}</p>`:""}
      <p><b>Salsas:</b> ${item.sauces.join(", ")||"Sin salsas"}</p>
      <p><b>Subtotal:</b> ${money(item.total)}</p>
      <button class="remove" onclick="removeCartItem(${i})">Eliminar</button>
    </div>`).join("") : '<div class="cart-item"><p>El carrito está vacío.</p></div>';

  get("cartItems").innerHTML = fullCart;
  get("cartTotal").textContent=money(cartTotal());

  const sideCount = document.getElementById("sideCartCount");
  if(sideCount) sideCount.textContent = cart.reduce((s,i)=>s+Number(i.quantity),0);

  const sideTotal = document.getElementById("sideCartTotal");
  if(sideTotal) sideTotal.textContent = money(cartTotal());

  const sideItems = document.getElementById("sideCartItems");
  if(sideItems){
    sideItems.innerHTML = cart.length ? cart.map((item,i)=>`
      <div class="side-cart-item">
        <h3>${item.quantity} x ${item.product}</h3>
        <p>${item.sauces.join(", ")||"Sin salsas"}</p>
        <p><b>${money(item.total)}</b></p>
      </div>`).join("") : '<div class="side-cart-item"><p>Aún no agregaste productos.</p></div>';
  }

  get("cashWith").style.display=get("payment").value==="Efectivo"?"block":"none";
}

async function sendOrder(){
  if(cart.length===0) return alert("Agregá productos al carrito");
  const name=val("name")||"Sin completar", phone=val("phone")||"Sin completar", address=val("address")||"Sin completar", neighborhood=val("neighborhood")||"Sin completar", reference=val("reference")||"Sin referencia", notes=val("notes")||"Sin aclaraciones", payment=get("payment").value, cashWith=val("cashWith");
  const order={customer:{name,phone,address,neighborhood,reference},items:cart.slice(),total:cartTotal(),notes,delivery,payment,cashWith};
  let msg="🍟 NUEVO PEDIDO SIMONE%0A%0A";
  msg+=`Cliente: ${name}%0ATeléfono: ${phone}%0A%0APEDIDO:%0A`;
  cart.forEach((it,idx)=>{
    msg+=`${idx+1}) ${it.quantity} x ${it.product} - ${money(it.unitPrice)} c/u%0A`;
    msg+=`Detalle: ${it.detail}%0A`;
    if(it.toppings.length) msg+=`Toppings: ${it.toppings.join(", ")}%0A`;
    msg+=`Salsas: ${it.sauces.join(", ")||"Sin salsas"}%0ASubtotal: ${money(it.total)}%0A%0A`;
  });
  msg+=`Aclaraciones: ${notes}%0A%0AENTREGA:%0AModalidad: ${delivery}%0ADirección: ${delivery==="Envío a domicilio"?address:"Retira por Madariaga 809"}%0A`;
  if(delivery==="Envío a domicilio") msg+=`Barrio: ${neighborhood}%0A`;
  msg+=`Referencia: ${reference}%0A%0APAGO:%0AForma de pago: ${payment}%0A`;
  if(payment==="Transferencia") msg+="Alias: lili.curuzu.colon%0ATitular: Sogaray Lilian Ines%0A";
  if(payment==="Efectivo"&&cashWith) msg+=`Paga con: ${cashWith}%0A`;
  msg+=`%0AEnvío: Según distancia%0ATOTAL APROXIMADO: ${money(cartTotal())}`;

  const res=await api("/api/orders",{method:"POST",body:JSON.stringify(order)});
  await loadMenu();
  window.open("https://wa.me/5493772584075?text="+msg,"_blank");
  alert("Pedido guardado como #"+res.id);
  cart=[];
  closeCart();
  render();
}

function renderAdmin(){
  if(!get("adminProducts")) return;
  get("adminProducts").innerHTML=menu.products.map(p=>`
    <div class="admin-row">
      <input value="${p.name}" onchange="updateProduct(${p.id},{name:this.value})">
      <input type="number" value="${p.price}" onchange="updateProduct(${p.id},{price:Number(this.value)})">
      <button class="switch ${p.active?'':'off'}" onclick="updateProduct(${p.id},{active:${!p.active}})">${p.active?'Activo':'Pausado'}</button>
    </div>`).join("");
  get("adminToppings").innerHTML=menu.toppings.map(t=>`
    <div class="admin-row two"><input value="${t.name}" onchange="updateTopping(${t.id},{name:this.value})"><button class="switch ${t.active?'':'off'}" onclick="updateTopping(${t.id},{active:${!t.active}})">${t.active?'Activo':'Pausado'}</button></div>`).join("");
  get("adminSauces").innerHTML=menu.sauces.map(s=>`
    <div class="admin-row two"><input value="${s.name}" onchange="updateSauce(${s.id},{name:this.value})"><button class="switch ${s.active?'':'off'}" onclick="updateSauce(${s.id},{active:${!s.active}})">${s.active?'Activo':'Pausado'}</button></div>`).join("");
}
function renderOrders(){
  if(!get("ordersList")) return;
  const today=new Date().toISOString().slice(0,10);
  const todayOrders=(orders||[]).filter(o=>(o.createdAt||"").slice(0,10)===today);
  const sales=todayOrders.reduce((s,o)=>s+Number(o.total||0),0);
  get("salesToday").textContent=money(sales);
  get("ordersToday").textContent=todayOrders.length;
  get("avgTicket").textContent=money(todayOrders.length?Math.round(sales/todayOrders.length):0);
  get("pendingOrders").textContent=(orders||[]).filter(o=>o.status==="Pendiente").length;

  get("ordersList").innerHTML=orders.length?orders.map(o=>`
    <div class="order-card">
      <h3>Pedido #${o.id} - ${o.status}</h3>
      <p><b>Cliente:</b> ${o.customer?.name||""}</p>
      <p><b>Tel:</b> ${o.customer?.phone||""}</p>
      <p><b>Items:</b> ${(o.items||[]).map(i=>`${i.quantity} x ${i.product}`).join(" / ")}</p>
      <p><b>Total:</b> ${money(o.total)}</p>
      <div class="order-actions">
        <select onchange="updateOrderStatus(${o.id},this.value)">
          <option ${o.status==="Pendiente"?"selected":""}>Pendiente</option>
          <option ${o.status==="Preparando"?"selected":""}>Preparando</option>
          <option ${o.status==="Listo"?"selected":""}>Listo</option>
          <option ${o.status==="Entregado"?"selected":""}>Entregado</option>
        </select>
        <button class="btn" onclick="printOrder(${o.id})">Imprimir</button>
      </div>
    </div>`).join(""):'<div class="order-card"><p>Todavía no hay pedidos.</p></div>';
}
async function updateProduct(id,data){await api("/api/products/"+id,{method:"PATCH",body:JSON.stringify(data)});await loadMenu()}
async function updateTopping(id,data){await api("/api/toppings/"+id,{method:"PATCH",body:JSON.stringify(data)});await loadMenu()}
async function updateSauce(id,data){await api("/api/sauces/"+id,{method:"PATCH",body:JSON.stringify(data)});await loadMenu()}
async function addProduct(){const name=val("newProductName"), price=Number(val("newProductPrice")), mode=get("newProductMode").value;if(!name||!price)return alert("Completá nombre y precio");await api("/api/products",{method:"POST",body:JSON.stringify({name,price,mode})});await loadMenu()}
async function addTopping(){const name=val("newToppingName");if(!name)return;await api("/api/toppings",{method:"POST",body:JSON.stringify({name})});await loadMenu()}
async function addSauce(){const name=val("newSauceName");if(!name)return;await api("/api/sauces",{method:"POST",body:JSON.stringify({name})});await loadMenu()}
async function updateOrderStatus(id,status){await api("/api/orders/"+id,{method:"PATCH",body:JSON.stringify({status})});await loadMenu()}
function printOrder(id){
  const o=orders.find(x=>x.id===id); if(!o)return;
  const items=(o.items||[]).map(it=>`
    <div><b>${it.quantity} x ${it.product}</b></div>
    <div>${it.detail}</div>
    ${it.toppings?.length?`<div>Toppings: ${it.toppings.join(", ")}</div>`:""}
    <div>Salsas: ${(it.sauces||[]).join(", ")}</div>
    <div>Subtotal: ${money(it.total)}</div>
    <div class="line"></div>`).join("");
  const html=`<div id="printTicket"><h1>SIMONE PAPAS FRITAS</h1><div style="text-align:center">Pedido #${o.id}</div><div style="text-align:center">${new Date(o.createdAt).toLocaleString("es-AR")}</div><div class="line"></div><div>Cliente: ${o.customer?.name||""}</div><div>Tel: ${o.customer?.phone||""}</div><div>Entrega: ${o.delivery||""}</div><div>Direccion: ${o.customer?.address||""}</div><div>Barrio: ${o.customer?.neighborhood||""}</div><div>Referencia: ${o.customer?.reference||""}</div><div class="line"></div>${items}<div>Pago: ${o.payment||""}</div><div>Envio: Segun distancia</div><div style="font-size:16px"><b>TOTAL: ${money(o.total)}</b></div><div class="line"></div><div style="text-align:center">Gracias por tu compra</div></div>`;
  const old=document.getElementById("printTicket"); if(old)old.remove();
  const div=document.createElement("div"); div.innerHTML=html; document.body.appendChild(div.firstElementChild); window.print();
}
["name","phone","address","neighborhood","reference","notes","cashWith","payment"].forEach(id=>{const el=get(id); if(el) el.addEventListener("input",render)});
loadMenu().then(checkAdminRoute);
