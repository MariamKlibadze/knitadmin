// admin.js
const API_URL = "https://696fcc0ea06046ce6187e52d.mockapi.io/products";

// ფასვორდი

// --- Admin prompt gate (CLIENT-SIDE ONLY) ---
const ADMIN_PASSWORD = "knit123"; // <-- change this
const ADMIN_KEY = "kb_admin_ok";

// Hide page until verified (prevents flashing admin UI)
document.documentElement.style.visibility = "hidden";

(function requireAdminPrompt() {
    // already unlocked for this tab/session
    if (sessionStorage.getItem(ADMIN_KEY) === "1") {
        document.documentElement.style.visibility = "";
        return;
    }

    const entered = prompt("Enter admin password:");

    if (entered === ADMIN_PASSWORD) {
        sessionStorage.setItem(ADMIN_KEY, "1");
        document.documentElement.style.visibility = "";
        return;
    }

    alert("Wrong password. Redirecting...");
    // Stop everything and leave
    window.location.replace("index.html");
    throw new Error("Admin blocked: wrong password");
})();


// ენდ ოფ ფასვორდი


// ---- DOM ----
const manageList = document.getElementById("manageList");
const mTitle = document.getElementById("mTitle");
const mPrice = document.getElementById("mPrice");
const mCategory = document.getElementById("mCategory");
const mDesc = document.getElementById("mDesc");
const mInStock = document.querySelector('input[name="inStock"]');
const mImageUrl = document.getElementById("imageUrl");
const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("category");
const sortSelect = document.getElementById("sort");
const productGrid = document.getElementById("productGrid");


// ---- State ----
let items = [];
let selectedId = null;

// ---- Helpers ----
function getStockRadioValue() {
    const checked = document.querySelector('input[name="stock"]:checked');
    return checked ? checked.value : "";
}
function toNumberOrZero(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
function renderProducts(list) {
    const safe = Array.isArray(list) ? list : [];

    if (!productGrid) return; // if element doesn't exist, avoid crashing

    if (safe.length === 0) {
        productGrid.innerHTML = `<p class="sub">No products found.</p>`;
        return;
    }

    productGrid.innerHTML = safe.map(productCardHTML).join("");
}

function applyFilters(list = []) {
    if (!Array.isArray(list)) list = [];
    const q = (searchInput?.value ?? "").trim().toLowerCase(); //თუ სერჩში რამე წერია წამოიღე (value) დატრიმე და დაალოუერქეისე 
    // თუ არადა დაწერე ""
    const cat = categorySelect?.value ?? "";
    const stock = getStockRadioValue(); //  ამას მნიშველობა ზემოთ მივანიჭე "" ეს ნიშნავს All-   ს, in, out

    let out = list;

    if (q) {
        out = out.filter(x =>
            x.title.toLowerCase().includes(q) ||
            x.description.toLowerCase().includes(q)
        );
    }

    //Q უნდა იყოს დესქრიფშენში ან თაითლში

    if (cat) out = out.filter(x => x.category === cat);
    if (stock === "in") out = out.filter(x => x.inStock === true);
    if (stock === "out") out = out.filter(x => x.inStock === false);
    const sort = sortSelect?.value ?? "new"; // თუ სორტი არაა მონიშნული წამოიღებს newest ს ანუ API ში როგორც მაქვს ჩამონათვალი ეგრე
    if (sort === "price-asc") out = [...out].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);

    return out;
}

function cleanedhtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeItem(raw) {
    return {
        id: raw.id,
        title: raw.title ?? "",
        price: toNumberOrZero(raw.price),
        category: raw.category ?? "yarn",
        inStock: Boolean(raw.inStock),
        description: raw.description ?? "",
        imageUrl: raw.imageUrl ?? ""
    };
}

function readFormData() {
    return {
        title: mTitle.value.trim(),
        price: toNumberOrZero(mPrice.value),
        category: mCategory.value,
        inStock: mInStock.checked,
        description: mDesc.value.trim(),
        imageUrl: mImageUrl.value.trim()
    };
}

function setFormData(item) {
    mTitle.value = item.title ?? "";
    mPrice.value = item.price ?? "";
    mCategory.value = item.category ?? "yarn";
    mInStock.checked = Boolean(item.inStock);
    mDesc.value = item.description ?? "";
    mImageUrl.value = item.imageUrl ?? "";
}

function clearForm() {
    selectedId = null;
    setFormData({
        title: "",
        price: "",
        category: "yarn",
        inStock: false,
        description: "",
        imageUrl: ""
    });
}

//API ის მეთოდები

//GET
async function getdata() {
    const res = await fetch(API_URL)
    if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json()
    return Array.isArray(data) ? data.map(normalizeItem) : [];


}
getdata()

//Post
async function apiCreate(payload) {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
    return normalizeItem(await res.json());
}

//Put
async function apiUpdate(id, payload) {
    const res = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
    return normalizeItem(await res.json());
}

//Delete
async function apiDelete(id) {
    const res = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
    return true;
}


// ---- Render (admin layout) ----
const FALLBACK_IMG =
    "https://images.garnstudio.com/img/shademap/cottonmerino/drops-cotton-merino1.jpg";

function adminItemHTML(item) {
    const title = cleanedhtml(item.title);
    const imgSrc = cleanedhtml(item.imageUrl || FALLBACK_IMG);

    return `
    <article class="admin-item" data-id="${cleanedhtml(item.id)}">
      <div class="admin-media">
        <img
          src="${imgSrc}"
          alt="${title}"
          loading="lazy"
          onerror="this.onerror=null; this.src='${FALLBACK_IMG}'"
        >
      </div>

      <div class="admin-body">
        <div class="admin-top">
          <h3 class="admin-title">${title}</h3>
          <span class="admin-price">$${Number(item.price).toFixed(2)}</span>
        </div>

        <p class="admin-catandstock">${cleanedhtml(item.category)} • ${item.inStock ? "In stock" : "Out of stock"}</p>
        <p class="admin-desc">${cleanedhtml(item.description || "No description")}</p>

        <div class="admin-actions">
          <button class="btn small glass" type="button" data-action="edit">Edit</button>
          <button class="btn small primary" type="button" data-action="delete">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function renderManageList(list) {
    if (!manageList) return;
    manageList.innerHTML = list.length
        ? list.map(adminItemHTML).join("")
        : `<div class="sub">No items yet. Create one using the form.</div>`;
}

async function refreshAll() {
    try {
        items = await getdata();
        renderManageList(items);
    } catch (err) {
        console.error("refreshAll failed:", err);
        alert(`Could not fetch data.\n\n${err.message}`);
    }
}


async function handleCreate() {
    const payload = readFormData();
    if (!payload.title) return alert("Title is required.");

    try {
        const created = await apiCreate(payload);
        items = [created, ...items];
        renderManageList(items);
        clearForm();
    } catch (err) {
        console.error(err);
        alert("Create failed.");
    }
}

async function handleUpdate() {
    if (!selectedId) return alert("Select Edit on an item first.");
    const payload = readFormData();
    if (!payload.title) return alert("Title is required.");

    try {
        const updated = await apiUpdate(selectedId, payload);
        items = items.map((x) => (x.id === selectedId ? updated : x));
        renderManageList(items);
    } catch (err) {
        console.error(err);
        alert("Update failed.");
    }
}

async function handleDeleteById(id) {
    if (!id) return;
    if (!confirm("Delete this item?")) return;

    try {
        await apiDelete(id);
        items = items.filter((x) => x.id !== id);
        renderManageList(items);
        if (selectedId === id) clearForm();
    } catch (err) {
        console.error(err);
        alert("Delete failed.");
    }
}

function handleEditById(id) {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    selectedId = id;
    setFormData(item);
}

function wireAdminClicks() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;

        // global actions (if you have these buttons)
        if (action === "fetch") return refreshAll();
        if (action === "create") return handleCreate();
        if (action === "update") return handleUpdate();

        // row actions
        const row = btn.closest("[data-id]");
        const id = row?.dataset.id;

        if (action === "edit") return handleEditById(id);
        if (action === "delete") return handleDeleteById(id);
    });
}

// ---- Init ----
wireAdminClicks();
clearForm();
refreshAll();


