const excelInput = document.getElementById("excelInput");
const processBtn = document.getElementById("processBtn");
const exportBtn = document.getElementById("exportBtn");
const statusBox = document.getElementById("status");
const dataTable = document.getElementById("dataTable");
const searchPanel = document.getElementById("searchPanel");
const buscador = document.getElementById("buscador");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const modalOverlay = document.getElementById("modalOverlay");
const modalFields = document.getElementById("modalFields");
const addRowForm = document.getElementById("addRowForm");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");

let filteredRows = [];
let currentColumns = [];

const materialCandidates = [
	"ficha de ingreso de materias primas",
	"materias primas",
	"materia prima",
	"droga",
	"nombre",
	"producto",
	"descripcion"
];

const dateCandidates = [
	"f ingreso",
	"fecha ingreso",
	"fecha de ingreso",
	"fecha",
	"fechaingreso",
	"fecharev"
];

const argentinaDateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
	timeZone: "America/Argentina/Buenos_Aires",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false
});

const argentinaDateFormatter = new Intl.DateTimeFormat("es-AR", {
	timeZone: "America/Argentina/Buenos_Aires",
	year: "numeric",
	month: "2-digit",
	day: "2-digit"
});

function normalizeText(value) {
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function findColumn(columns, candidates) {
	const normalizedColumns = columns.map((col) => ({
		original: col,
		normalized: normalizeText(col).replace(/[_-]/g, " ")
	}));

	for (const candidate of candidates) {
		const found = normalizedColumns.find((c) => c.normalized.includes(candidate));
		if (found) return found.original;
	}
	return null;
}

function parseExcelDate(value) {
	if (value == null || value === "") return null;

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value;
	}

	if (typeof value === "number") {
		const parsed = XLSX.SSF.parse_date_code(value);
		if (parsed) {
			return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
		}
	}

	const asDate = new Date(value);
	if (!Number.isNaN(asDate.getTime())) {
		return asDate;
	}

	return null;
}

function hasRealTime(value) {
	if (value instanceof Date) {
		return value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
	}

	if (typeof value === "number") {
		const parsed = XLSX.SSF.parse_date_code(value);
		if (!parsed) return false;
		return (parsed.H || 0) !== 0 || (parsed.M || 0) !== 0 || (parsed.S || 0) !== 0;
	}

	if (typeof value === "string") {
		return /\d{1,2}:\d{2}(:\d{2})?/.test(value);
	}

	return false;
}

function isDateColumn(columnName) {
	const normalized = normalizeText(columnName);
	return normalized.includes("fecha") || normalized.startsWith("f ");
}

function formatValueForCell(value, columnName) {
	if (value == null || value === "") return "";

	if (!isDateColumn(columnName)) {
		return String(value);
	}

	const parsedDate = parseExcelDate(value);
	if (!parsedDate) {
		return String(value);
	}

	if (hasRealTime(value)) {
		return argentinaDateTimeFormatter.format(parsedDate);
	}

	return argentinaDateFormatter.format(parsedDate);
}

function filterLatestByMaterial(rows, materialColumn, dateColumn) {
	const latestByMaterial = new Map();

	for (const row of rows) {
		const materialRaw = row[materialColumn];
		const materialKey = normalizeText(materialRaw);
		if (!materialKey) continue;

		const parsedDate = parseExcelDate(row[dateColumn]);
		const existing = latestByMaterial.get(materialKey);

		if (!existing) {
			latestByMaterial.set(materialKey, { row, parsedDate });
			continue;
		}

		const existingTime = existing.parsedDate ? existing.parsedDate.getTime() : -Infinity;
		const currentTime = parsedDate ? parsedDate.getTime() : -Infinity;

		if (currentTime >= existingTime) {
			latestByMaterial.set(materialKey, { row, parsedDate });
		}
	}

	return Array.from(latestByMaterial.values())
		.sort((a, b) => {
			const tA = a.parsedDate ? a.parsedDate.getTime() : -Infinity;
			const tB = b.parsedDate ? b.parsedDate.getTime() : -Infinity;
			return tB - tA;
		})
		.map((item) => item.row);
}

function renderTable(rows, columns) {
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    const headerRow = document.createElement("tr");

    columns.forEach((col, i) => {
        const th = document.createElement("th");
        th.textContent = col;

       
        if (normalizeText(col).includes("precio")) {
            th.classList.add("precio-col");
        }

        headerRow.appendChild(th);
    });

    tableHead.appendChild(headerRow);

    const fragment = document.createDocumentFragment();

    rows.forEach((row) => {
        const tr = document.createElement("tr");

        columns.forEach((col) => {
            const td = document.createElement("td");
            td.textContent = formatValueForCell(row[col], col);

            
            if (normalizeText(col).includes("precio")) {
                td.classList.add("precio-col");
            }

            tr.appendChild(td);
        });

        fragment.appendChild(tr);
    });

    tableBody.appendChild(fragment);
    dataTable.classList.remove("hidden");
}

function updateStatus(message, isError = false) {
	statusBox.textContent = message;
	statusBox.style.color = isError ? "#7d1d1d" : "#244f44";
	statusBox.style.background = isError ? "#fff1f1" : "#f5fbf8";
}

function setResultsVisibility(hasData) {
	if (hasData) {
		searchPanel.classList.remove("hidden");
		dataTable.classList.remove("hidden");
		openModalBtn.disabled = false;
		return;
	}

	searchPanel.classList.add("hidden");
	dataTable.classList.add("hidden");
	tableHead.innerHTML = "";
	tableBody.innerHTML = "";
	buscador.value = "";
	openModalBtn.disabled = true;
}

function buildModalFields(columns) {
	modalFields.innerHTML = "";

	columns.forEach((column) => {
		const fieldWrap = document.createElement("div");
		fieldWrap.className = "field-wrap";

		const label = document.createElement("label");
		const safeId = `field-${normalizeText(column).replace(/\s+/g, "-")}`;
		label.setAttribute("for", safeId);
		label.textContent = column;

		const input = document.createElement("input");
		input.id = safeId;
		input.name = column;
		input.type = isDateColumn(column) ? "datetime-local" : "text";

		fieldWrap.appendChild(label);
		fieldWrap.appendChild(input);
		modalFields.appendChild(fieldWrap);
	});
}

function openModal() {
	if (!currentColumns.length) {
		updateStatus("Primero carga una planilla para habilitar Agregar producto.", true);
		return;
	}

	buildModalFields(currentColumns);
	modalOverlay.classList.remove("hidden");
	const firstInput = modalFields.querySelector("input");
	if (firstInput) firstInput.focus();
}

function closeModal() {
	modalOverlay.classList.add("hidden");
	addRowForm.reset();
}

function filtrar() {
    
    const query = document.getElementById("buscador").value.toLowerCase();
    const rows = dataTable.getElementsByTagName("tr");

    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName("td");
        let rowText = "";
        for (let j = 0; j < cells.length; j++) {
            rowText += cells[j].textContent.toLowerCase() + " ";
        }
        rows[i].style.display = rowText.includes(query) ? "" : "none";
    }
    
}

processBtn.addEventListener("click", async () => {
	const file = excelInput.files[0];
	if (!file) {
		updateStatus("Selecciona un archivo .xls o .xlsx para continuar.", true);
		return;
	}

	try {
		updateStatus("Procesando planilla...");
		exportBtn.disabled = true;
		setResultsVisibility(false);

		const buffer = await file.arrayBuffer();
		const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

		const firstSheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[firstSheetName];
		const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

		if (!rows.length) {
			updateStatus("La planilla no contiene datos para mostrar.", true);
			setResultsVisibility(false);
			return;
		}

		const columns = Object.keys(rows[0]);
		const materialColumn = findColumn(columns, materialCandidates);
		const dateColumn = findColumn(columns, dateCandidates);

		if (!materialColumn || !dateColumn) {
			updateStatus(
				"No pude detectar automaticamente las columnas de Materia Prima y Fecha. Verifica los encabezados.",
				true
			);
			setResultsVisibility(false);
			return;
		}

		filteredRows = filterLatestByMaterial(rows, materialColumn, dateColumn);
		const precioColumn = findColumn(columns, ["precio kg", "precio"]);

		if (!precioColumn) {
			updateStatus("No se encontró la columna Precio KG.", true);
			return;
		}

		const index = columns.indexOf(precioColumn);

	
		currentColumns = columns.slice(0, index + 1);

		renderTable(filteredRows, currentColumns);
		setResultsVisibility(filteredRows.length > 0);
		exportBtn.disabled = false;

		updateStatus(
			`Listo: ${rows.length} filas originales -> ${filteredRows.length} materias primas unicas (ultima fecha).`
		);
	} catch (error) {
		console.error(error);
		setResultsVisibility(false);
		updateStatus("Hubo un error al leer el archivo. Revisa que sea un Excel valido.", true);
	}
});

exportBtn.addEventListener("click", () => {
	if (!filteredRows.length) {
		updateStatus("No hay datos filtrados para exportar.", true);
		return;
	}

	const exportSheet = XLSX.utils.json_to_sheet(filteredRows, { header: currentColumns });
	const exportBook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(exportBook, exportSheet, "Ultimos_Ingresos");
	XLSX.writeFile(exportBook, "Materia_Prima_Ultimos_Ingresos.xlsx");
	updateStatus("Archivo exportado: Materia_Prima_Ultimos_Ingresos.xlsx");
});

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (event) => {
	if (event.target === modalOverlay) {
		closeModal();
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && !modalOverlay.classList.contains("hidden")) {
		closeModal();
	}
});

addRowForm.addEventListener("submit", (event) => {
	event.preventDefault();

	if (!currentColumns.length) {
		updateStatus("No hay columnas disponibles para agregar producto.", true);
		closeModal();
		return;
	}

	const newRow = {};
	currentColumns.forEach((column) => {
		const field = addRowForm.elements.namedItem(column);
		newRow[column] = field ? field.value.trim() : "";
	});

	filteredRows.unshift(newRow);
	renderTable(filteredRows, currentColumns);
	filtrar();
	closeModal();

	updateStatus("Producto agregado correctamente en la tabla.");
});

setResultsVisibility(false);
