
const $ = (id) => document.getElementById(id);

const KEY = "smartstock-data-v1";

const initialData = {
    products: [
        {id: 1, name: "Notebook", code: "P001", category: "Informática", quantity: 20, minimum: 5, sold: 1000},
        {id: 2, name: "Celular", code: "P002", category: "Eletrônicos", quantity: 9, minimum: 10, sold: 950},
        {id: 3, name: "Teclado", code: "P003", category: "Periféricos", quantity: 6, minimum: 8, sold: 750},
        {id: 4, name: "Mouse", code: "P004", category: "Periféricos", quantity: 15, minimum: 5, sold: 600},
        {id: 5, name: "Monitor", code: "P005", category: "Informática", quantity: 0, minimum: 5, sold: 300}
    ],
    movements: [],
    resolved: []
};

let data = loadData();
let currentUser = "Usuário";

// CARREGAR DADOS

function loadData() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || structuredClone(initialData);
    } catch {
        return structuredClone(initialData);
    }
}

function saveData() {
    localStorage.setItem(KEY, JSON.stringify(data));
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

function money(value) {
    return Number(value).toLocaleString("pt-BR");
}

// NAVEGAÇÃO

function showPage(name) {
    document.querySelectorAll(".page").forEach(p => {
        p.classList.add("hidden");
    });

    $("page-" + name).classList.remove("hidden");

    document.querySelectorAll(".nav-link").forEach(b => {
        b.classList.toggle("active", b.dataset.page === name);
    });

    renderAll();
}

document.querySelectorAll(".nav-link").forEach(b => {
    b.addEventListener("click", () => showPage(b.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(b => {
    b.addEventListener("click", () => showPage(b.dataset.go));
});

// LOGIN

$("login-form").addEventListener("submit", e => {
    e.preventDefault();

    const email = $("email").value.trim();

    if (!email || !$("password").value) {
        $("login-error").textContent = "Preencha o e-mail e a senha.";
        return;
    }

    currentUser = email.split("@")[0];

    $("user-name").textContent = currentUser;

    $("login-screen").classList.add("hidden");
    $("app").classList.remove("hidden");

    showPage("home");
});

// SAIR

$("logout").addEventListener("click", () => {
    $("app").classList.add("hidden");
    $("login-screen").classList.remove("hidden");
    $("password").value = "";
});

$("account-button").addEventListener("click", () => {
    alert("Conta conectada: " + currentUser);
});

// CADASTRO DE PRODUTOS

function openProductDialog(product = null) {
    $("product-form").reset();

    $("edit-id").value = product?.id ?? "";

    $("dialog-title").textContent = product
        ? "Editar produto"
        : "Cadastrar produto";

    $("product-name").value = product?.name ?? "";
    $("product-code").value = product?.code ?? "";
    $("product-category").value = product?.category ?? "";
    $("product-quantity").value = product?.quantity ?? 0;
    $("product-minimum").value = product?.minimum ?? 5;

    $("product-dialog").showModal();
}

$("add-product").addEventListener("click", () => {
    openProductDialog();
});

$("cancel-dialog").addEventListener("click", () => {
    $("product-dialog").close();
});

$("product-form").addEventListener("submit", e => {
    e.preventDefault();

    const id = $("edit-id").value;

    const item = {
        id: id ? Number(id) : Date.now(),
        name: $("product-name").value.trim(),
        code: $("product-code").value.trim(),
        category: $("product-category").value.trim(),
        quantity: Number($("product-quantity").value),
        minimum: Number($("product-minimum").value),
        sold: 0
    };

    if (!item.name || !item.code || !item.category ||
        item.quantity < 0 || item.minimum < 0) {
        return;
    }

    if (id) {
        const old = data.products.find(p => p.id === Number(id));

        item.sold = old?.sold || 0;

        data.products = data.products.map(p =>
            p.id === item.id ? item : p
        );
    } else {
        data.products.push(item);
    }

    saveData();

    $("product-dialog").close();

    renderAll();
});

// PESQUISAR E MOSTRAR PRODUTOS

$("product-search").addEventListener("input", renderProducts);

function renderProducts() {
    const term = $("product-search").value.toLowerCase();

    const list = data.products.filter(p =>
        (p.name + " " + p.code + " " + p.category)
            .toLowerCase()
            .includes(term)
    );

    $("products-table").innerHTML = list.map(p => `
        <tr>
            <td>${escapeHTML(p.name)}</td>
            <td>${escapeHTML(p.code)}</td>
            <td>${escapeHTML(p.category)}</td>
            <td>${p.quantity}</td>
            <td>
                <button class="edit-btn" data-edit="${p.id}">
                    Editar
                </button>
                <button class="delete-btn" data-delete="${p.id}">
                    Excluir
                </button>
            </td>
        </tr>
    `).join("") || `
        <tr>
            <td colspan="5">Nenhum produto cadastrado.</td>
        </tr>
    `;

    document.querySelectorAll("[data-edit]").forEach(b => {
        b.addEventListener("click", () => {
            openProductDialog(
                data.products.find(p => p.id === Number(b.dataset.edit))
            );
        });
    });

    document.querySelectorAll("[data-delete]").forEach(b => {
        b.addEventListener("click", () => {
            if (confirm("Deseja excluir este produto?")) {
                data.products = data.products.filter(
                    p => p.id !== Number(b.dataset.delete)
                );

                saveData();
                renderAll();
            }
        });
    });
}

// MOVIMENTAÇÃO DE ESTOQUE

function renderMovementOptions() {
    $("movement-product").innerHTML = data.products.map(p => `
        <option value="${p.id}">
            ${escapeHTML(p.name)} (${p.quantity} un.)
        </option>
    `).join("");
}

$("movement-form").addEventListener("submit", e => {
    e.preventDefault();

    const product = data.products.find(
        p => p.id === Number($("movement-product").value)
    );

    const type = $("movement-type").value;
    const quantity = Number($("movement-quantity").value);
    const person = $("movement-person").value.trim();

    if (!product || quantity < 1 || !person) {
        return;
    }

    if (type === "Saída" && quantity > product.quantity) {
        alert("Estoque insuficiente! Disponível: " + product.quantity);
        return;
    }

    if (type === "Entrada") {
        product.quantity += quantity;
    } else {
        product.quantity -= quantity;
        product.sold += quantity;
    }

    data.movements.unshift({
        date: new Date().toLocaleString("pt-BR"),
        type,
        product: product.name,
        quantity,
        person
    });

    saveData();

    $("movement-form").reset();

    renderAll();
});

function renderMovements() {
    $("movements-table").innerHTML = data.movements.map(m => `
        <tr>
            <td>${escapeHTML(m.date)}</td>
            <td>${m.type}</td>
            <td>${escapeHTML(m.product)}</td>
            <td>${m.quantity}</td>
            <td>${escapeHTML(m.person)}</td>
        </tr>
    `).join("") || `
        <tr>
            <td colspan="5">Nenhuma movimentação registrada.</td>
        </tr>
    `;
}

// INDICADORES

function statsHTML() {
    const entries = data.movements
        .filter(m => m.type === "Entrada")
        .reduce((s, m) => s + m.quantity, 0);

    const exits = data.movements
        .filter(m => m.type === "Saída")
        .reduce((s, m) => s + m.quantity, 0);

    const cards = [
        ["Total de produtos", data.products.length],
        ["Entrada do mês", money(entries)],
        ["Saída do mês", money(exits)]
    ];

    return cards.map(([label, value]) => `
        <div class="stat-card">
            ${label}
            <strong>${value}</strong>
            <small>Dados registrados no sistema</small>
        </div>
    `).join("");
}

// GRÁFICOS DE BARRAS

function renderBars(target, items, valueFn) {
    const max = Math.max(1, ...items.map(valueFn));

    $(target).innerHTML = items.length
        ? items.map(item => `
            <div class="bar-row">
                <span>${escapeHTML(item.name)}</span>

                <div class="bar-track">
                    <div class="bar-fill"
                         style="width:${Math.max(1, valueFn(item) / max * 100)}%">
                    </div>
                </div>

                <b>${money(valueFn(item))}</b>
            </div>
        `).join("")
        : "<p>Nenhum dado disponível.</p>";
}

// TELA INICIAL

function renderHome() {
    renderBars(
        "best-sellers",
        [...data.products]
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 5),
        p => p.sold
    );
}

// DASHBOARD

function renderDashboard() {
    $("dashboard-stats").innerHTML = statsHTML();

    const entries = data.movements
        .filter(m => m.type === "Entrada")
        .reduce((s, m) => s + m.quantity, 0);

    const exits = data.movements
        .filter(m => m.type === "Saída")
        .reduce((s, m) => s + m.quantity, 0);

    const total = entries + exits;

    const outPercent = total ? exits / total * 100 : 50;

    $("movement-summary").innerHTML = `
        <div class="donut"
             style="--out-percent:${outPercent}%">
        </div>
        <p>Entradas: ${entries} · Saídas: ${exits}</p>
    `;

    drawMovementChart();
}

// GRÁFICO DE MOVIMENTAÇÕES

function drawMovementChart() {
    const canvas = $("movement-chart");
    const ctx = canvas.getContext("2d");

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "#9c83ac";
    ctx.fillStyle = "#eadcf2";
    ctx.font = "13px Arial";

    const recent = data.movements.slice(0, 7).reverse();

    const values = recent.map(m => m.quantity);

    for (let i = 0; i < 5; i++) {
        let y = 25 + i * 58;

        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(w - 10, y);
        ctx.stroke();

        ctx.fillText(
            String(Math.round(Math.max(1, ...values) * ((4 - i) / 4))),
            4,
            y + 4
        );
    }

    if (!recent.length) {
        ctx.fillText(
            "Registre movimentações para visualizar o gráfico.",
            50,
            150
        );
        return;
    }

    const max = Math.max(1, ...values);

    ctx.strokeStyle = "#5795ff";
    ctx.lineWidth = 3;
    ctx.beginPath();

    values.forEach((v, i) => {
        const x = 45 + i * (w - 70) / Math.max(1, values.length - 1);
        const y = h - 30 - (v / max) * (h - 75);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        ctx.fillStyle = "#5795ff";
        ctx.fillRect(x - 4, y - 4, 8, 8);

        ctx.fillStyle = "#eadcf2";
        ctx.fillText(recent[i].type, x - 18, h - 8);
    });

    ctx.stroke();
}

// RELATÓRIOS

function renderReports() {
    $("report-stats").innerHTML = statsHTML();

    renderBars(
        "stock-report",
        data.products,
        p => p.quantity
    );

    $("report-summary").innerHTML = `
        <p>Produtos cadastrados:
            <b>${data.products.length}</b>
        </p>

        <p>Movimentações registradas:
            <b>${data.movements.length}</b>
        </p>
    `;
}

// ALERTAS

function getAlerts() {
    return data.products.filter(p =>
        p.quantity === 0 || p.quantity <= p.minimum
    );
}

function renderAlerts() {
    const active = getAlerts();

    $("active-alerts").innerHTML = active.map(p => `
        <div class="alert-item">
            <strong>
                ${p.quantity === 0 ? "URGENTE" : "ATENÇÃO"}
            </strong>

            ${escapeHTML(p.name)} —

            ${p.quantity === 0
                ? "Produto sem estoque"
                : `Apenas ${p.quantity} unidades`}

            <button data-resolve="${p.id}">✓</button>
        </div>
    `).join("") || "<p>Nenhum alerta ativo.</p>";

    $("resolved-alerts").innerHTML = data.resolved.map(p => `
        <div class="alert-item">
            <strong>RESOLVIDO</strong>
            ${escapeHTML(p.name)} — Estoque atualizado
        </div>
    `).join("") || "<p>Nenhum alerta resolvido.</p>";

    document.querySelectorAll("[data-resolve]").forEach(b => {
        b.addEventListener("click", () => {
            const p = data.products.find(
                x => x.id === Number(b.dataset.resolve)
            );

            if (p && p.quantity > p.minimum) {
                data.resolved.unshift({name: p.name});
                saveData();
                renderAlerts();
            } else {
                alert(
                    "Para resolver, atualize o estoque do produto para acima do mínimo."
                );
            }
        });
    });
}

// EXPORTAR RELATÓRIO

$("export-report").addEventListener("click", () => {
    const rows = [
        ["Produto", "Código", "Categoria", "Estoque", "Mínimo"],
        ...data.products.map(p => [
            p.name,
            p.code,
            p.category,
            p.quantity,
            p.minimum
        ])
    ];

    const csv = rows.map(r =>
        r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")
    ).join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        {type: "text/csv;charset=utf-8"}
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-smartstock.csv";
    a.click();

    URL.revokeObjectURL(url);
});

// ATUALIZAR O SISTEMA

function renderAll() {
    renderProducts();
    renderMovementOptions();
    renderMovements();
    renderHome();
    renderDashboard();
    renderReports();
    renderAlerts();
}
