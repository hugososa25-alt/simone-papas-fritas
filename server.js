const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");

const app = express();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Hugo1976!";
const PRINT_API_KEY = process.env.PRINT_API_KEY || "";
const CAJA_PASSWORD = process.env.CAJA_PASSWORD || ADMIN_PASSWORD;

if (!process.env.DATABASE_URL) {
  console.error("FALTA DATABASE_URL en Render");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));


/* =========================================================
   DATOS INICIALES
========================================================= */

const defaultData = {

  products: [

    {
      id: 1,
      name: "Simone Mini",
      price: 3000,
      mode: "toppings",
      categoryId: 1,
      detail: "Papas fritas + toppings + salsas",
      image: "img/cono_mini.png",
      active: true
    },

    {
      id: 2,
      name: "Simone Clásico",
      price: 7500,
      mode: "toppings",
      categoryId: 1,
      detail: "Papas fritas + toppings + salsas",
      image: "img/cono_clasico.png",
      active: true
    },

    {
      id: 3,
      name: "Simone Full",
      price: 9500,
      mode: "toppings",
      categoryId: 1,
      detail: "Papas fritas + toppings + salsas",
      image: "img/cono_full.png",
      active: true
    },

    {
      id: 4,
      name: "Box de Papas",
      price: 9500,
      mode: "toppings",
      categoryId: 1,
      detail: "Papas fritas + toppings + salsas",
      image: "img/box_papas.png",
      active: true
    },

    {
      id: 5,
      name: "Box Premium Simone",
      price: 10000,
      mode: "solo_salsas",
      categoryId: 1,
      detail:
        "Papas fritas, patitas, formitas, bastones de mozzarella, caritas de papa y aros de cebolla",
      image: "img/hero_box.png",
      active: true
    },

    {
      id: 6,
      name: "Pollo Crujiente",
      price: 6000,
      mode: "solo_salsas",
      categoryId: 1,
      detail: "Pollo crujiente + salsas",
      image: "img/pollo_crujiente.png",
      active: true
    },

    {
      id: 7,
      name: "Pollo Crujiente + Papas",
      price: 8000,
      mode: "solo_salsas",
      categoryId: 1,
      detail: "Pollo crujiente + papas fritas + salsas",
      image: "img/pollo_crujiente_papas.png",
      active: true
    },

    {
      id: 8,
      name: "Stella Artois Pure Gold 330",
      price: 10000,
      mode: "solo_salsas",
      categoryId: 1,
      detail: "3 botellas 330cc",
      image: "img/stella_pure_gold_330.png",
      active: true
    }

  ],


  toppings: [

    {
      id: 1,
      name: "Huevo picado en cubitos",
      image: "img/huevo_picado.png",
      active: true
    },

    {
      id: 2,
      name: "Mortadela",
      image: "img/mortadela.png",
      active: true
    },

    {
      id: 3,
      name: "Queso",
      image: "img/queso.png",
      active: true
    },

    {
      id: 4,
      name: "Paleta",
      image: "img/paleta.png",
      active: true
    },

    {
      id: 5,
      name: "Salchichas",
      image: "img/salchichas.png",
      active: true
    },

    {
      id: 6,
      name: "Milanesas",
      image: "img/milanesas.png",
      active: true
    },

    {
      id: 7,
      name: "Salame",
      image: "img/salame.png",
      active: true
    },

    {
      id: 8,
      name: "Salsa criolla",
      image: "img/salsa_criolla.png",
      active: true
    },

    {
      id: 9,
      name: "Arvejas",
      image: "img/arvejas.png",
      active: true
    },

    {
      id: 10,
      name: "Pepinos",
      image: "img/pepinos.png",
      active: true
    },

    {
      id: 11,
      name: "Choclo",
      image: "img/choclo.png",
      active: true
    },

    {
      id: 12,
      name: "boniato",
      image: "img/boniato.png",
      active: true
    }

  ],


  sauces: [

    {
      id: 1,
      name: "Mayonesa",
      image: "img/mayonesa.png",
      active: true
    },

    {
      id: 2,
      name: "Mayonesa con ajo",
      image: "img/mayonesa_ajo.png",
      active: true
    },

    {
      id: 3,
      name: "Mayonesa con verdeo",
      image: "img/mayonesa_verdeo.png",
      active: true
    },

    {
      id: 4,
      name: "Ketchup",
      image: "img/ketchup.png",
      active: true
    },

    {
      id: 5,
      name: "Mostaza",
      image: "img/mostaza.png",
      active: true
    },

    {
      id: 6,
      name: "Barbacoa",
      image: "img/barbacoa.png",
      active: true
    },

    {
      id: 7,
      name: "Cheddar",
      image: "img/cheddar.png",
      active: true
    }

  ],

  categories: [
    {
      id: 1,
      name: "Papas y comidas",
      active: true,
      order: 1
    }
  ],

  orders: []

};


/* =========================================================
   SUPABASE
========================================================= */

async function initDb() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS simone_store (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(
    `
    INSERT INTO simone_store (id, data)
    VALUES (1, $1::jsonb)
    ON CONFLICT (id) DO NOTHING
    `,
    [JSON.stringify(defaultData)]
  );

}


async function readDb() {

  const result = await pool.query(
    "SELECT data FROM simone_store WHERE id = 1"
  );

  if (!result.rows.length) {

    await writeDb(defaultData);

    return JSON.parse(
      JSON.stringify(defaultData)
    );

  }

  const data = result.rows[0].data;

  if (!data.orders)
    data.orders = [];

  if (!data.products)
    data.products = defaultData.products;

  if (!data.toppings)
    data.toppings = defaultData.toppings;

  if (!data.sauces)
    data.sauces = defaultData.sauces;

  if (!data.categories || !Array.isArray(data.categories) || !data.categories.length) {
    data.categories = JSON.parse(
      JSON.stringify(defaultData.categories)
    );
  }

  let needsSave = false;

  data.products.forEach((product) => {
    if (product.categoryId === undefined || product.categoryId === null) {
      product.categoryId = 1;
      needsSave = true;
    }
  });

  if (needsSave) {
    await writeDb(data);
  }

  return data;

}


async function writeDb(data) {

  await pool.query(
    `
    INSERT INTO simone_store (id, data, updated_at)
    VALUES (1, $1::jsonb, NOW())

    ON CONFLICT (id)

    DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = NOW()
    `,
    [JSON.stringify(data)]
  );

}


/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function nextId(list) {

  return list.length
    ? Math.max(
        ...list.map(
          (x) => Number(x.id)
        )
      ) + 1
    : 1;

}


function asyncRoute(fn) {

  return (req, res, next) => {

    Promise
      .resolve(
        fn(req, res, next)
      )
      .catch(next);

  };

}


/* =========================================================
   IMPRESION AUTOMATICA - SEGURIDAD
========================================================= */

function requirePrintKey(req, res, next) {
  if (!PRINT_API_KEY) {
    return res.status(503).json({
      error: "PRINT_API_KEY no configurada"
    });
  }

  const key = String(req.get("x-print-key") || "");

  if (key !== PRINT_API_KEY) {
    return res.status(401).json({
      error: "No autorizado"
    });
  }

  next();
}


/* =========================================================
   CAJA - SEGURIDAD Y MESAS
========================================================= */

function requireCajaKey(req, res, next) {
  const key = String(req.get("x-caja-key") || "");
  if (!CAJA_PASSWORD || key !== CAJA_PASSWORD) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

function normalizeTableNumber(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 15 ? n : null;
}

function isTableOrder(order) {
  return order && (order.delivery === "Consumo en mesa" || normalizeTableNumber(order.tableNumber || order.table) !== null);
}


/* =========================================================
   MENU
========================================================= */

app.get(
  "/api/menu",

  asyncRoute(
    async (req, res) => {

      const data = await readDb();

      res.json({
        products: data.products || [],
        toppings: data.toppings || [],
        sauces: data.sauces || [],
        categories: data.categories || []
      });

    }
  )
);


/* =========================================================
   LOGIN ADMINISTRADOR
========================================================= */

app.post(
  "/api/admin/login",

  (req, res) => {

    const { password } =
      req.body || {};

    if (
      password ===
      ADMIN_PASSWORD
    ) {

      return res.json({
        ok: true
      });

    }

    return res
      .status(401)
      .json({
        ok: false
      });

  }
);


/* =========================================================
   ACTUALIZAR PRODUCTO
========================================================= */

app.patch(
  "/api/products/:id",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const item =
        data.products.find(
          (p) =>
            p.id ===
            Number(req.params.id)
        );

      if (!item) {

        return res
          .status(404)
          .json({
            error:
              "Producto no encontrado"
          });

      }

      item.name =
        req.body.name ??
        item.name;

      item.price =
        req.body.price ??
        item.price;

      item.mode =
        req.body.mode ??
        item.mode;

      if (req.body.categoryId !== undefined) {
        const categoryId = Number(req.body.categoryId);
        const categoryExists = data.categories.some(
          (category) => category.id === categoryId
        );

        if (!categoryExists) {
          return res.status(400).json({
            error: "Categoría no válida"
          });
        }

        item.categoryId = categoryId;
      }

      item.detail =
        req.body.detail ??
        item.detail;

      item.image =
        req.body.image ??
        item.image;

      item.active =
        req.body.active === undefined
          ? item.active
          : Boolean(
              req.body.active
            );

      await writeDb(data);

      res.json({
        ok: true
      });

    }
  )
);


/* =========================================================
   AGREGAR PRODUCTO
========================================================= */

app.post(
  "/api/products",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const {
        name,
        price,
        mode,
        categoryId,
        detail,
        image
      } = req.body;

      if (!name || !price) {

        return res
          .status(400)
          .json({
            error:
              "Falta nombre o precio"
          });

      }

      const selectedCategoryId =
        categoryId === undefined || categoryId === null || categoryId === ""
          ? 1
          : Number(categoryId);

      const categoryExists = data.categories.some(
        (category) => category.id === selectedCategoryId
      );

      if (!categoryExists) {
        return res.status(400).json({
          error: "Categoría no válida"
        });
      }

      const item = {

        id:
          nextId(
            data.products
          ),

        name,

        price:
          Number(price),

        mode:
          mode ||
          "toppings",

        categoryId:
          selectedCategoryId,

        detail:
          detail ||
          "Producto Simone",

        image:
          image ||
          "img/hero_box.png",

        active: true

      };

      data.products.push(
        item
      );

      await writeDb(data);

      res.json({
        ok: true,
        id: item.id
      });

    }
  )
);


/* =========================================================
   CATEGORIAS
========================================================= */

app.post(
  "/api/categories",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const name =
        String(req.body?.name || "").trim();

      if (!name) {
        return res.status(400).json({
          error: "Falta nombre de categoría"
        });
      }

      const duplicated = data.categories.some(
        (category) =>
          String(category.name).trim().toLowerCase() ===
          name.toLowerCase()
      );

      if (duplicated) {
        return res.status(400).json({
          error: "La categoría ya existe"
        });
      }

      const item = {
        id: nextId(data.categories),
        name,
        active: true,
        order: data.categories.length + 1
      };

      data.categories.push(item);

      await writeDb(data);

      res.json({
        ok: true,
        id: item.id
      });

    }
  )
);


app.patch(
  "/api/categories/:id",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const item = data.categories.find(
        (category) =>
          category.id === Number(req.params.id)
      );

      if (!item) {
        return res.status(404).json({
          error: "Categoría no encontrada"
        });
      }

      if (req.body.name !== undefined) {
        const name = String(req.body.name).trim();

        if (!name) {
          return res.status(400).json({
            error: "El nombre de la categoría no puede estar vacío"
          });
        }

        const duplicated = data.categories.some(
          (category) =>
            category.id !== item.id &&
            String(category.name).trim().toLowerCase() ===
              name.toLowerCase()
        );

        if (duplicated) {
          return res.status(400).json({
            error: "La categoría ya existe"
          });
        }

        item.name = name;
      }

      if (req.body.active !== undefined) {
        item.active = Boolean(req.body.active);
      }

      if (req.body.order !== undefined) {
        const order = Number(req.body.order);
        if (Number.isFinite(order)) {
          item.order = order;
        }
      }

      await writeDb(data);

      res.json({
        ok: true
      });

    }
  )
);


/* =========================================================
   ACTUALIZAR TOPPINGS / SALSAS
========================================================= */

async function patchList(
  listName,
  id,
  body,
  res
) {

  const data =
    await readDb();

  const item =
    data[listName].find(
      (x) =>
        x.id ===
        Number(id)
    );

  if (!item) {

    return res
      .status(404)
      .json({
        error:
          "No encontrado"
      });

  }

  item.name =
    body.name ??
    item.name;

  item.active =
    body.active === undefined
      ? item.active
      : Boolean(
          body.active
        );

  await writeDb(data);

  res.json({
    ok: true
  });

}


/* =========================================================
   TOPPINGS
========================================================= */

app.patch(
  "/api/toppings/:id",

  asyncRoute(
    async (req, res) => {

      await patchList(
        "toppings",
        req.params.id,
        req.body,
        res
      );

    }
  )
);


app.post(
  "/api/toppings",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const { name } =
        req.body;

      if (!name) {

        return res
          .status(400)
          .json({
            error:
              "Falta nombre"
          });

      }

      const item = {

        id:
          nextId(
            data.toppings
          ),

        name,

        image:
          "img/mortadela.png",

        active: true

      };

      data.toppings.push(
        item
      );

      await writeDb(data);

      res.json({
        ok: true,
        id: item.id
      });

    }
  )
);


/* =========================================================
   SALSAS
========================================================= */

app.patch(
  "/api/sauces/:id",

  asyncRoute(
    async (req, res) => {

      await patchList(
        "sauces",
        req.params.id,
        req.body,
        res
      );

    }
  )
);


app.post(
  "/api/sauces",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const { name } =
        req.body;

      if (!name) {

        return res
          .status(400)
          .json({
            error:
              "Falta nombre"
          });

      }

      const item = {

        id:
          nextId(
            data.sauces
          ),

        name,

        image:
          "img/mayonesa.png",

        active: true

      };

      data.sauces.push(
        item
      );

      await writeDb(data);

      res.json({
        ok: true,
        id: item.id
      });

    }
  )
);


/* =========================================================
   PEDIDOS
========================================================= */

app.get(
  "/api/orders",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      res.json(
        data.orders
          .slice()
          .reverse()
      );

    }
  )
);


app.post(
  "/api/orders",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const requestedTable = normalizeTableNumber(req.body?.tableNumber || req.body?.table);
      const tableOrder = req.body?.delivery === "Consumo en mesa" || requestedTable !== null;

      if (tableOrder && requestedTable === null) {
        return res.status(400).json({ error: "Mesa no válida" });
      }

      const order = {

        id:
          nextId(
            data.orders
          ),

        createdAt:
          new Date()
            .toISOString(),

        ...req.body,

        delivery: tableOrder ? "Consumo en mesa" : req.body?.delivery,
        tableNumber: tableOrder ? requestedTable : null,
        paymentStatus: tableOrder ? "Pendiente" : "No aplica",
        paidAt: null,

        status:
          tableOrder ? "Pendiente de pago" : "Pendiente",

        printStatus:
          tableOrder ? "EsperandoPago" : "Pendiente",

        printedAt:
          null

      };

      data.orders.push(
        order
      );

      await writeDb(data);

      res.json({
        ok: true,
        id: order.id
      });

    }
  )
);


app.patch(
  "/api/orders/:id",

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const order =
        data.orders.find(
          (o) =>
            o.id ===
            Number(req.params.id)
        );

      if (!order) {

        return res
          .status(404)
          .json({
            error:
              "Pedido no encontrado"
          });

      }

      order.status =
        req.body.status ??
        order.status;

      await writeDb(data);

      res.json({
        ok: true
      });

    }
  )
);


/* =========================================================
   MESAS - DISPONIBILIDAD PUBLICA PARA QR UNICO
========================================================= */

app.get(
  "/api/tables/availability",
  asyncRoute(async (req, res) => {
    const data = await readDb();
    const tableOrders = data.orders.filter(isTableOrder);

    const tables = Array.from({ length: 15 }, (_, i) => {
      const tableNumber = i + 1;
      const activeOrders = tableOrders.filter(o =>
        Number(o.tableNumber || o.table) === tableNumber &&
        o.tableClosed !== true
      );

      return {
        tableNumber,
        available: activeOrders.length === 0
      };
    });

    res.json(tables);
  })
);


/* =========================================================
   CAJA - CONSUMO EN MESA
========================================================= */

app.post("/api/caja/login", (req, res) => {
  const password = String(req.body?.password || "");
  if (password === CAJA_PASSWORD) return res.json({ ok: true });
  return res.status(401).json({ ok: false });
});

app.get(
  "/api/caja/tables",
  requireCajaKey,
  asyncRoute(async (req, res) => {
    const data = await readDb();
    const tableOrders = data.orders.filter(isTableOrder);

    const tables = Array.from({ length: 15 }, (_, i) => {
      const tableNumber = i + 1;
      const list = tableOrders
        .filter(o => Number(o.tableNumber || o.table) === tableNumber && o.tableClosed !== true)
        .sort((a, b) => Number(a.id) - Number(b.id));

      const pendingPayment = list.filter(o => o.paymentStatus !== "Pagado").length;
      const paid = list.filter(o => o.paymentStatus === "Pagado").length;

      let state = "Libre";
      if (pendingPayment > 0) state = "Pendiente de pago";
      else if (paid > 0) state = "Ocupada";

      return {
        tableNumber,
        state,
        pendingPayment,
        paid,
        orderCount: list.length,
        orders: list
      };
    });

    res.json(tables);
  })
);

app.post(
  "/api/caja/orders/:id/pay",
  requireCajaKey,
  asyncRoute(async (req, res) => {
    const data = await readDb();
    const order = data.orders.find(o => o.id === Number(req.params.id));

    if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
    if (!isTableOrder(order)) return res.status(400).json({ error: "No es un pedido de mesa" });

    order.paymentStatus = "Pagado";
    order.paidAt = new Date().toISOString();
    order.status = "Preparando";

    if (order.printStatus !== "Impreso") {
      order.printStatus = "Pendiente";
      order.printedAt = null;
    }

    await writeDb(data);
    res.json({ ok: true, id: order.id, paymentStatus: order.paymentStatus, printStatus: order.printStatus });
  })
);

app.post(
  "/api/caja/tables/:number/release",
  requireCajaKey,
  asyncRoute(async (req, res) => {
    const tableNumber = normalizeTableNumber(req.params.number);
    if (tableNumber === null) return res.status(400).json({ error: "Mesa no válida" });

    const data = await readDb();
    const activeOrders = data.orders.filter(o =>
      isTableOrder(o) &&
      Number(o.tableNumber || o.table) === tableNumber &&
      o.tableClosed !== true
    );

    const unpaid = activeOrders.filter(o => o.paymentStatus !== "Pagado");
    if (unpaid.length) {
      return res.status(409).json({ error: "La mesa tiene pedidos pendientes de pago" });
    }

    const now = new Date().toISOString();
    activeOrders.forEach(o => {
      o.tableClosed = true;
      o.tableClosedAt = now;
    });

    await writeDb(data);
    res.json({ ok: true, tableNumber });
  })
);


/* =========================================================
   IMPRESION AUTOMATICA DE PEDIDOS
   Uso exclusivo de la PC del local
========================================================= */

app.get(
  "/api/print/orders/pending",
  requirePrintKey,

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const pending = data.orders
        .filter((order) =>
          order.printStatus === "Pendiente" &&
          (!isTableOrder(order) || order.paymentStatus === "Pagado")
        )
        .slice()
        .sort((a, b) =>
          Number(a.id) - Number(b.id)
        );

      res.json(pending);

    }
  )
);


app.post(
  "/api/print/orders/:id/printed",
  requirePrintKey,

  asyncRoute(
    async (req, res) => {

      const data =
        await readDb();

      const order =
        data.orders.find(
          (item) =>
            item.id ===
            Number(req.params.id)
        );

      if (!order) {
        return res.status(404).json({
          error: "Pedido no encontrado"
        });
      }

      order.printStatus =
        "Impreso";

      order.printedAt =
        new Date().toISOString();

      await writeDb(data);

      res.json({
        ok: true,
        id: order.id,
        printStatus: order.printStatus,
        printedAt: order.printedAt
      });

    }
  )
);


/* =========================================================
   IMAGENES DISPONIBLES
   Lee automaticamente public/img
========================================================= */

app.get(
  "/api/images",

  asyncRoute(
    async (req, res) => {

      const imagesFolder = path.join(
        __dirname,
        "public",
        "img"
      );

      const files = await fs.readdir(imagesFolder);

      const images = files
        .filter((file) =>
          /\.(png|jpg|jpeg|webp|gif)$/i.test(file)
        )
        .sort((a, b) =>
          a.localeCompare(b, "es", { sensitivity: "base" })
        )
        .map((file) => ({
          name: file,
          path: "img/" + file
        }));

      res.json(images);

    }
  )
);


/* =========================================================
   PAGINA WEB
========================================================= */

app.get("/caja", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "caja.html"));
});


app.get(
  "*",

  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


/* =========================================================
   ERRORES
========================================================= */

app.use(
  (err, req, res, next) => {

    console.error(
      "ERROR SIMONE:",
      err
    );

    res
      .status(500)
      .json({
        error:
          "Error de base de datos"
      });

  }
);


/* =========================================================
   INICIAR SERVIDOR
========================================================= */

const PORT =
  process.env.PORT ||
  3000;


initDb()

  .then(() => {

    app.listen(
      PORT,
      () => {

        console.log("");
        console.log(
          "=========================================="
        );

        console.log(
          " SIMONE + SUPABASE funcionando"
        );

        console.log(
          " Puerto:",
          PORT
        );

        console.log(
          "=========================================="
        );

        console.log("");

      }
    );

  })

  .catch((err) => {

    console.error(
      "NO SE PUDO CONECTAR A SUPABASE:",
      err
    );

    process.exit(1);

  });
