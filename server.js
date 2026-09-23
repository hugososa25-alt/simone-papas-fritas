const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Hugo1976!";

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

const defaultData = {
  products: [
    {
      id: 1,
      name: "Simone Mini",
      price: 3000,
      mode: "toppings",
      detail: "Papas fritas + toppings + salsas",
      image: "img/cono_mini.png",
      active: true
    },
    {
      id: 2,
      name: "Simone Clásico",
      price: 7500,
      mode: "toppings",
      detail: "Papas fritas + toppings + salsas",
      image: "img/cono_clasico.png",
      active: true
    },
    {
      id: 3,
      name: "Simone Full",
      price: 9500,
      mode: "toppings",
      detail: "Papas fritas + toppings + salsas",
      image: "img/cono_full.png",
      active: true
    },
    {
      id: 4,
      name: "Box de Papas",
      price: 9500,
      mode: "toppings",
      detail: "Papas fritas + toppings + salsas",
      image: "img/box_papas.png",
      active: true
    },
    {
      id: 5,
      name: "Box Premium Simone",
      price: 10000,
      mode: "solo_salsas",
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
      detail: "Pollo crujiente + salsas",
      image: "img/pollo_crujiente.png",
      active: true
    },
    {
      id: 7,
      name: "Pollo Crujiente + Papas",
      price: 8000,
      mode: "solo_salsas",
      detail: "Pollo crujiente + papas fritas + salsas",
      image: "img/pollo_crujiente_papas.png",
      active: true
    },
    {
      id: 8,
      name: "Stella Artois Pure Gold 330",
      price: 10000,
      mode: "solo_salsas",
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

  orders: []
};

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
    return JSON.parse(JSON.stringify(defaultData));
  }

  const data = result.rows[0].data;

  if (!data.orders) data.orders = [];
  if (!data.products) data.products = defaultData.products;
  if (!data.toppings) data.toppings = defaultData.toppings;
  if (!data.sauces) data.sauces = defaultData.sauces;

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

function nextId(list) {
  return list.length
    ? Math.max(...list.map((x) => Number(x.id))) + 1
    : 1;
}

function asyncRoute(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get(
  "/api/menu",
  asyncRoute(async (req, res) => {
    res.json(await readDb());
  })
);

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};

  if (password === ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }

  return res.status(401).json({ ok: false });
});

app.patch(
  "/api/products/:id",
  asyncRoute(async (req, res) => {
    const data = await readDb();

    const item = data.products.find(
      (p) => p.id === Number(req.params.id)
    );

    if (!item) {
      return res
        .status(404)
        .json({ error: "Producto no encontrado" });
    }

    item.name = req.body.name ?? item.name;
    item.price = req.body.price ?? item.price;
    item.mode = req.body.mode ?? item.mode;
    item.detail = req.body.detail ?? item.detail;

    item.active =
      req.body.active === undefined
        ? item.active
        : Boolean(req.body.active);

    await writeDb(data);

    res.json({ ok: true });
  })
);

app.post(
  "/api/products",
  asyncRoute(async (req, res) => {
    const data = await readDb();

    const { name, price, mode, detail } = req.body;

    if (!name || !price) {
      return res
        .status(400)
        .json({ error: "Falta nombre o precio" });
    }

    const item = {
      id: nextId(data.products),
      name,
      price: Number(price),
      mode: mode || "toppings",
      detail: detail || "Producto Simone",
      image: "img/hero_box.png",
      active: true
    };

    data.products.push(item);

    await writeDb(data);

    res.json({
      ok: true,
      id: item.id
    });
  })
);

async function patchList(listName, id, body, res) {
  const data = await readDb();

  const item = data[listName].find(
    (x) => x.id === Number(id)
  );

  if (!item) {
    return res.status(404).json({
      error: "No encontrado"
    });
  }

  item.name = body.name ?? item.name;

  item.active =
    body.active === undefined
      ? item.active
      : Boolean(body.active);

  await writeDb(data);

  res.json({ ok: true });
}

app.patch(
  "/api/toppings/:id",
  asyncRoute(async (req, res) => {
    await patchList(
      "toppings",
      req.params.id,
      req.body,
      res
    );
  })
);

app.patch(
  "/api/sauces/:id",
  asyncRoute(async (req, res) => {
    await patchList(
      "sauces",
      req.params.id,
      req.body,
      res
    );
  })
);

app.post(
  "/api/toppings",
  asyncRoute(async (req, res) => {
    const data = await readDb();

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Falta nombre"
      });
    }

    const item = {
      id: nextId(data.toppings),
      name,
      image: "img/mortadela.png",
      active: true
    };

    data.toppings.push(item);

    await writeDb(data);

    res.json({
      ok: true,
      id: item.id
    });
  })
);

app.post(
  "/api/sauces",
  asyncRoute(async (req, res) => {
    const data = await readDb();

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Falta nombre"
      });
    }

    const item = {
      id: nextId(data.sauces),
      name,
      image: "img/mayonesa.png",
      active: true
    };

    data.sauces.push(item);

    await writeDb(data);

    res.json({
      ok: true,
      id: item.id
    });
  })
);

app.get(
  "/api/orders",
  asyncRoute(async (req, res) => {
    const data = await readDb();

    res.json(
      data.orders.slice().reverse()
    );
  })
);

app.post(
  "/api/orders",
  asyncRoute(async (req, res) => {
    const data = await readDb();

    const order = {
      id: nextId(data.orders),
      createdAt: new Date().toISOString(),
      status: "Pendiente",
      ...req.body
    };

    data.orders.push(order);

    await writeDb(data);

    res.json({
      ok: true,
      id: order.id
    });
  })
);

app.patch(
  "/api/orders/:id",
  asyncRoute(async (req, res) => {
    const data = await readDb();

    const order = data.orders.find(
      (o) => o.id === Number(req.params.id)
    );

    if (!order) {
      return res.status(404).json({
        error: "Pedido no encontrado"
      });
    }

    order.status =
      req.body.status ?? order.status;

    await writeDb(data);

    res.json({ ok: true });
  })
);

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.use((err, req, res, next) => {
  console.error("ERROR SIMONE:", err);

  res.status(500).json({
    error: "Error de base de datos"
  });
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log("");
      console.log("==========================================");
      console.log(" SIMONE + SUPABASE funcionando");
      console.log(" Puerto:", PORT);
      console.log("==========================================");
      console.log("");
    });
  })
  .catch((err) => {
    console.error(
      "NO SE PUDO CONECTAR A SUPABASE:",
      err
    );

    process.exit(1);
  });
