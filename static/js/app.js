// Global state
let jsonData = null;
let parsedData = [];
let allColumns = [];
let selectedColumns = [];
let filters = [];
let pgliteDB = null;
let sortConfig = { column: null, direction: 'asc' };

// Default sample JSON data
const defaultJSON = {
    "users": [
        { "id": 1, "name": "Alice Johnson", "email": "alice@example.com", "department": "Engineering", "salary": 95000, "joinDate": "2021-03-15" },
        { "id": 2, "name": "Bob Smith", "email": "bob@example.com", "department": "Marketing", "salary": 75000, "joinDate": "2021-06-20" },
        { "id": 3, "name": "Carol White", "email": "carol@example.com", "department": "Engineering", "salary": 98000, "joinDate": "2020-01-10" },
        { "id": 4, "name": "David Brown", "email": "david@example.com", "department": "Sales", "salary": 85000, "joinDate": "2022-02-14" },
        { "id": 5, "name": "Eve Davis", "email": "eve@example.com", "department": "Engineering", "salary": 92000, "joinDate": "2021-11-05" }
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadDefaultJSON();
});

function setupEventListeners() {
    // File input
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('jsonInput').value = event.target.result;
            };
            reader.readAsText(file);
        }
    });

    // SQL Query keyboard shortcut (Ctrl+Enter) and auto-expand
    const sqlQuery = document.getElementById('sqlQuery');
    if (sqlQuery) {
        sqlQuery.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                executeSQLQuery();
            }
        });

        // Auto-expand textarea as user types
        sqlQuery.addEventListener('input', function() {
            this.style.height = '32px';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }
}

function loadDefaultJSON() {
    document.getElementById('jsonInput').value = JSON.stringify(defaultJSON, null, 2);
    setTimeout(() => {
        parseJSON();
    }, 100);
}

function toggleTopSection() {
    const topSection = document.getElementById('topSection');
    const btn = document.getElementById('topSectionToggle');

    topSection.classList.toggle('collapsed');

    if (topSection.classList.contains('collapsed')) {
        btn.textContent = 'Show Section';
    } else {
        btn.textContent = 'Hide Section';
    }
}

function toggleOutputSection() {
    const outputPanel = document.getElementById('outputPanel');
    const btn = document.getElementById('outputSectionToggle');

    outputPanel.classList.toggle('collapsed');

    if (outputPanel.classList.contains('collapsed')) {
        btn.textContent = 'Show Section';
    } else {
        btn.textContent = 'Hide Section';
    }
}

function toggleQuerySection() {
    const queryPanel = document.getElementById('queryPanel');
    const btn = document.getElementById('querySectionToggle');

    queryPanel.classList.toggle('collapsed');

    if (queryPanel.classList.contains('collapsed')) {
        btn.textContent = 'Show Section';
    } else {
        btn.textContent = 'Hide Section';
    }
}

function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('detailsStatusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;

    if (type !== 'error') {
        setTimeout(() => {
            statusEl.classList.remove('show');
        }, 3000);
    }
}

function parseJSON() {
    try {
        const input = document.getElementById('jsonInput').value.trim();

        if (!input) {
            showStatus('Please paste or upload JSON data', 'error');
            return;
        }

        jsonData = JSON.parse(input);

        // Normalize data to array of objects
        normalizeData();

        // Detect structure
        detectStructure();

        // Build column list
        buildColumns();

        // Build table
        buildTable();

        // Initialize PGLite
        initializePGLite();

        showStatus('JSON parsed successfully! ' + parsedData.length + ' records found.', 'success');
    } catch (error) {
        showStatus('Invalid JSON: ' + error.message, 'error');
    }
}

function normalizeData() {
    // Step 1: Flatten all paths to leaf values
    const flatPaths = flattenToLeafPaths(jsonData);

    // Step 2: Convert to CSV-like format
    const csvRows = pathsToCSV(flatPaths);

    // Step 3: Parse CSV to rows with smart column grouping
    parsedData = csvToRows(csvRows);
}

// Step 1: Flatten JSON to all leaf paths
// Returns: { "Demographic.Age and Gender.All.MA_Payment": 8405.09, ... }
function flattenToLeafPaths(obj, parentKey = '') {
    let flattened = {};

    if (obj === null || obj === undefined) {
        return { [parentKey]: obj };
    }

    if (typeof obj !== 'object') {
        return { [parentKey]: obj };
    }

    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            const key = parentKey ? `${parentKey}[${index}]` : `[${index}]`;
            Object.assign(flattened, flattenToLeafPaths(item, key));
        });
        return flattened;
    }

    const keys = Object.keys(obj);
    let hasNestedObject = false;

    keys.forEach(key => {
        const value = obj[key];
        const newKey = parentKey ? `${parentKey}.${key}` : key;

        if (value === null || value === undefined) {
            flattened[newKey] = value;
        } else if (typeof value === 'object') {
            hasNestedObject = true;
            Object.assign(flattened, flattenToLeafPaths(value, newKey));
        } else {
            flattened[newKey] = value;
        }
    });

    return flattened;
}

// Step 2: Convert flattened paths to CSV format
function pathsToCSV(flatPaths) {
    // Each flattened path becomes a row in CSV
    // Path: "Demographic.Age and Gender.All.MA_Payment"
    // Value: 8405.09
    const rows = [];

    for (let path in flatPaths) {
        const value = flatPaths[path];
        const parts = path.split('.');
        const record = {};

        // Split path into parts (except last which is the metric name)
        parts.forEach((part, index) => {
            if (index < parts.length - 1) {
                record[`path_${index}`] = part;
            } else {
                record['metric'] = part;
            }
        });

        record['value'] = value;
        rows.push(record);
    }

    return rows;
}

// Step 3: Convert CSV rows to final table with smart column grouping
function csvToRows(csvRows) {
    if (csvRows.length === 0) return [];

    // Find max path depth
    let maxPathDepth = 0;
    csvRows.forEach(row => {
        let depth = 0;
        while (row[`path_${depth}`] !== undefined) {
            depth++;
            maxPathDepth = Math.max(maxPathDepth, depth);
        }
    });

    // Group rows by their path (everything except metric)
    const grouped = {};

    csvRows.forEach(row => {
        // Create path key from path_0, path_1, path_2, etc.
        const pathKeys = [];
        for (let i = 0; i < maxPathDepth; i++) {
            if (row[`path_${i}`] !== undefined) {
                pathKeys.push(row[`path_${i}`]);
            }
        }
        const pathKey = pathKeys.join('|');

        if (!grouped[pathKey]) {
            grouped[pathKey] = {};
            pathKeys.forEach((key, index) => {
                grouped[pathKey][`path_${index}`] = key;
            });
        }

        // Add metric as column
        grouped[pathKey][row.metric] = row.value;
    });

    // Convert grouped object to array
    const result = Object.values(grouped);

    // Clean up and rename columns
    result.forEach(row => {
        // Rename path_0, path_1 to more meaningful names
        const pathNames = ['Category', 'SubCategory', 'Type', 'Status', 'Level5', 'Level6'];
        for (let i = 0; i < pathNames.length; i++) {
            if (row[`path_${i}`] !== undefined) {
                row[pathNames[i]] = row[`path_${i}`];
                delete row[`path_${i}`];
            }
        }
    });

    return result;
}

function detectStructure() {
    if (parsedData.length === 0) return;

    // Hide empty state
    const detailsEmpty = document.getElementById('detailsEmpty');
    if (detailsEmpty) {
        detailsEmpty.classList.add('hide');
    }
}

function buildColumns() {
    allColumns = [];

    if (parsedData.length === 0) return;

    const sample = parsedData[0];
    if (typeof sample === 'object') {
        allColumns = Object.keys(sample).sort();
    }

    selectedColumns = [...allColumns];

    // Render column selector with drag-drop support
    renderColumnList();

    document.getElementById('columnSelector').classList.remove('hide');
    document.getElementById('filterControls').classList.remove('hide');
}

function renderColumnList() {
    const columnList = document.getElementById('columnList');
    columnList.innerHTML = '';

    allColumns.forEach((col, index) => {
        const div = document.createElement('div');
        div.className = 'column-item';
        div.draggable = true;
        div.dataset.columnIndex = index;
        div.dataset.columnName = col;

        div.innerHTML = `
            <span class="drag-handle">⋮⋮</span>
            <input type="checkbox" id="col_${col}" checked onchange="updateSelectedColumns()">
            <label for="col_${col}">${escapeHtml(col)}</label>
        `;

        // Drag events
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);
        div.addEventListener('dragenter', handleDragEnter);
        div.addEventListener('dragleave', handleDragLeave);

        columnList.appendChild(div);
    });
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    if (this !== draggedElement) {
        // Swap columns
        const draggedIndex = parseInt(draggedElement.dataset.columnIndex);
        const targetIndex = parseInt(this.dataset.columnIndex);

        // Swap in allColumns array
        [allColumns[draggedIndex], allColumns[targetIndex]] = [allColumns[targetIndex], allColumns[draggedIndex]];

        // Re-render the column list
        renderColumnList();

        // Update table with new column order
        updateSelectedColumns();
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.column-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedElement = null;
}

function updateSelectedColumns() {
    selectedColumns = [];
    // Get columns in the current order from allColumns array
    allColumns.forEach(col => {
        const checkbox = document.getElementById(`col_${col}`);
        if (checkbox && checkbox.checked) {
            selectedColumns.push(col);
        }
    });
    buildTable();
}

function selectAllColumns() {
    allColumns.forEach(col => {
        const checkbox = document.getElementById(`col_${col}`);
        if (checkbox) checkbox.checked = true;
    });
    updateSelectedColumns();
}

function deselectAllColumns() {
    allColumns.forEach(col => {
        const checkbox = document.getElementById(`col_${col}`);
        if (checkbox) checkbox.checked = false;
    });
    updateSelectedColumns();
}

function buildTable() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const tableContainer = document.getElementById('tableContainer');
    const noDataEl = document.getElementById('noData');

    let filteredData = getFilteredData();

    if (selectedColumns.length === 0 || filteredData.length === 0) {
        tableContainer.classList.add('hide');
        noDataEl.classList.remove('hide');
        document.getElementById('statsContainer').style.display = 'none';
        return;
    }

    // Build header
    tableHead.innerHTML = '';
    selectedColumns.forEach(col => {
        const th = document.createElement('th');
        th.innerHTML = `${escapeHtml(col)} <span class="sort-indicator">${getSortIndicator(col)}</span>`;
        th.onclick = () => sortTable(col);
        tableHead.appendChild(th);
    });

    // Build body
    tableBody.innerHTML = '';
    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        selectedColumns.forEach(col => {
            const td = document.createElement('td');
            const value = row[col];
            td.textContent = formatCellValue(value);
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    tableContainer.classList.remove('hide');
    noDataEl.classList.add('hide');

    // Update stats
    updateStats(filteredData);
    document.getElementById('statsContainer').style.display = 'grid';
}

function getFilteredData() {
    let filtered = [...parsedData];

    // Apply filters
    if (filters.length > 0) {
        filtered = filtered.filter(row => {
            return filters.every(filter => {
                // Skip filter if column or operator not selected
                if (!filter.column || !filter.operator) return true;

                // Skip filter if value is empty AND operator requires a value
                const operatorsNeedingValue = ['equals', 'notequals', 'contains', 'starts', 'ends', 'gt', 'lt', 'gte', 'lte'];
                if (operatorsNeedingValue.includes(filter.operator) && filter.value === '') return true;

                const value = row[filter.column];
                const filterVal = filter.value;

                switch (filter.operator) {
                    case 'equals':
                        return String(value).toLowerCase() === filterVal.toLowerCase();
                    case 'notequals':
                        return String(value).toLowerCase() !== filterVal.toLowerCase();
                    case 'contains':
                        return String(value).toLowerCase().includes(filterVal.toLowerCase());
                    case 'starts':
                        return String(value).toLowerCase().startsWith(filterVal.toLowerCase());
                    case 'ends':
                        return String(value).toLowerCase().endsWith(filterVal.toLowerCase());
                    case 'isnull':
                        return value === null || value === undefined || value === '';
                    case 'isnotnull':
                        return value !== null && value !== undefined && value !== '';
                    case 'gt':
                        return Number(value) > Number(filterVal);
                    case 'lt':
                        return Number(value) < Number(filterVal);
                    case 'gte':
                        return Number(value) >= Number(filterVal);
                    case 'lte':
                        return Number(value) <= Number(filterVal);
                    default:
                        return true;
                }
            });
        });
    }

    // Apply search
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(row => {
            return selectedColumns.some(col => {
                return String(row[col]).toLowerCase().includes(searchTerm);
            });
        });
    }

    // Apply sorting
    if (sortConfig.column) {
        filtered.sort((a, b) => {
            let aVal = a[sortConfig.column];
            let bVal = b[sortConfig.column];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
}

function applySearch() {
    buildTable();
}

function sortTable(column) {
    if (sortConfig.column === column) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.column = column;
        sortConfig.direction = 'asc';
    }
    buildTable();
}

function getSortIndicator(column) {
    if (sortConfig.column !== column) return '';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
}

function addFilterRow() {
    filters.push({ column: '', operator: 'equals', value: '' });
    renderFilters();
    toggleApplyButton();
}

function applyFilters() {
    buildTable();
    showStatus('Filters applied successfully', 'success');
}

function toggleApplyButton() {
    const applyBtn = document.getElementById('applyFilterBtn');
    if (applyBtn) {
        applyBtn.style.display = filters.length > 0 ? 'flex' : 'none';
    }
}

function renderFilters() {
    const filterList = document.getElementById('filterList');
    filterList.innerHTML = '';

    filters.forEach((filter, index) => {
        const div = document.createElement('div');
        div.className = 'filter-row';
        div.innerHTML = `
            <select onchange="updateFilter(${index}, 'column', this.value)">
                <option value="">Select Column</option>
                ${allColumns.map(col => `<option value="${col}" ${filter.column === col ? 'selected' : ''}>${escapeHtml(col)}</option>`).join('')}
            </select>
            <select onchange="updateFilter(${index}, 'operator', this.value)">
                <option value="equals" ${filter.operator === 'equals' ? 'selected' : ''}>Equals</option>
                <option value="notequals" ${filter.operator === 'notequals' ? 'selected' : ''}>Not Equals</option>
                <option value="contains" ${filter.operator === 'contains' ? 'selected' : ''}>Contains</option>
                <option value="starts" ${filter.operator === 'starts' ? 'selected' : ''}>Starts with</option>
                <option value="ends" ${filter.operator === 'ends' ? 'selected' : ''}>Ends with</option>
                <option value="isnull" ${filter.operator === 'isnull' ? 'selected' : ''}>IS NULL/Empty</option>
                <option value="isnotnull" ${filter.operator === 'isnotnull' ? 'selected' : ''}>IS NOT NULL/Empty</option>
                <option value="gt" ${filter.operator === 'gt' ? 'selected' : ''}>Greater than</option>
                <option value="lt" ${filter.operator === 'lt' ? 'selected' : ''}>Less than</option>
                <option value="gte" ${filter.operator === 'gte' ? 'selected' : ''}>≥</option>
                <option value="lte" ${filter.operator === 'lte' ? 'selected' : ''}>≤</option>
            </select>
            <input type="text" placeholder="Filter value" value="${filter.value}" onchange="updateFilter(${index}, 'value', this.value)">
            <button class="btn-danger btn-sm" onclick="removeFilter(${index})" style="padding: 8px 12px;">×</button>
        `;
        filterList.appendChild(div);
    });
}

function updateFilter(index, field, value) {
    if (filters[index]) {
        filters[index][field] = value;
    }
}

function removeFilter(index) {
    filters.splice(index, 1);
    renderFilters();
    toggleApplyButton();
    applyFilters();
}

function updateStats(data) {
    document.getElementById('statRows').textContent = parsedData.length;
    document.getElementById('statColumns').textContent = selectedColumns.length;
    document.getElementById('statFiltered').textContent = data.length;
}

function formatCellValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        return JSON.stringify(value).substring(0, 50) + '...';
    }
    return String(value).substring(0, 200);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function initializePGLite() {
    try {
        // Check if PGLite is available
        if (!window.PGlite) {
            showStatus('PGLite library loading... Please wait', 'info');
            setTimeout(initializePGLite, 500);
            return;
        }

        if (!pgliteDB) {
            // Initialize the PGLite database
            pgliteDB = new window.PGlite();
            // Test connection
            await pgliteDB.query("SELECT 1");
        }

        // Create and load table
        await reloadDatabase();

    } catch (error) {
        console.error('Database Error:', error);
        showStatus('Database initialization failed: ' + error.message, 'error');
    }
}

async function reloadDatabase() {
    try {
        if (!pgliteDB) {
            showStatus('Database not initialized', 'error');
            return;
        }

        // Get current filtered data
        const data = getFilteredData();
        if (data.length === 0) {
            showStatus('No data to load into database', 'error');
            return;
        }

        // Drop existing table if it exists
        try {
            await pgliteDB.query('DROP TABLE IF EXISTS json_data');
        } catch (e) {
            // Ignore if table doesn't exist
        }

        // Create table with proper column types
        const columns = selectedColumns.map(col => {
            const sample = data.find(row => row[col] !== null && row[col] !== undefined);
            const value = sample ? sample[col] : '';
            let type = 'TEXT';

            if (typeof value === 'number') {
                type = 'NUMERIC';
            } else if (typeof value === 'boolean') {
                type = 'BOOLEAN';
            }

            return `"${col}" ${type}`;
        }).join(', ');

        // Create table without auto id - just use the columns from data
        const createTableSQL = `CREATE TABLE json_data (${columns})`;
        await pgliteDB.query(createTableSQL);

        // Insert data using parameterized queries
        const insertCols = selectedColumns.map(col => `"${col}"`).join(', ');
        const placeholders = selectedColumns.map((_, i) => `$${i + 1}`).join(', ');
        const insertSQL = `INSERT INTO json_data (${insertCols}) VALUES (${placeholders})`;

        for (const row of data) {
            const values = selectedColumns.map(col => {
                const val = row[col];
                return val === null || val === undefined ? null : val;
            });
            try {
                await pgliteDB.query(insertSQL, values);
            } catch (e) {
                console.warn('Row insert error:', e);
            }
        }

        // Show database is ready
        document.getElementById('pgliteSection').classList.remove('hide');
        document.getElementById('pgliteNotReady').classList.add('hide');

        // Update query placeholder with table info
        const queryInput = document.getElementById('sqlQuery');
        queryInput.placeholder = `SELECT * FROM json_data LIMIT 10;  -- Use table name: json_data (${data.length} rows)`;

        showStatus('Database loaded with ' + data.length + ' rows', 'success');

    } catch (error) {
        console.error('Database reload error:', error);
        showStatus('Failed to load data into database: ' + error.message, 'error');
    }
}

async function executeSQLQuery() {
    const queryErrorEl = document.getElementById('queryError');

    // Clear any previous error
    queryErrorEl.classList.add('hide');
    queryErrorEl.textContent = '';

    try {
        if (!pgliteDB) {
            showQueryError('Database not initialized yet. Please wait and try again.');
            return;
        }

        const query = document.getElementById('sqlQuery').value.trim();
        if (!query) {
            showQueryError('Please enter a SQL query');
            return;
        }

        // Execute query and get results
        try {
            const result = await pgliteDB.query(query);

            // Handle different result types
            const rows = result.rows || result || [];
            displayQueryResult(Array.isArray(rows) ? rows : []);
            showStatus('Query executed successfully', 'success');
            // Scroll to results on success
            setTimeout(() => {
                document.getElementById('queryResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (e) {
            document.getElementById('queryResult').classList.add('hide');
            showQueryError('Query error: ' + e.message);
        }

    } catch (error) {
        document.getElementById('queryResult').classList.add('hide');
        showQueryError('Query error: ' + error.message);
    }
}

function showQueryError(message) {
    const queryErrorEl = document.getElementById('queryError');
    const queryPanel = document.getElementById('queryPanel');
    const pgliteSection = document.getElementById('pgliteSection');

    // Show the error message
    queryErrorEl.textContent = message;
    queryErrorEl.classList.remove('hide');

    // Expand the query panel if collapsed
    if (queryPanel.classList.contains('collapsed')) {
        queryPanel.classList.remove('collapsed');
        const btn = document.getElementById('querySectionToggle');
        if (btn) {
            btn.textContent = 'Hide Section';
        }
    }

    // Show the input section if hidden
    if (pgliteSection && pgliteSection.classList.contains('hide')) {
        pgliteSection.classList.remove('hide');
    }

    // Scroll to the error message
    setTimeout(() => {
        queryErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function displayQueryResult(result) {
    const resultContent = document.getElementById('resultContent');
    const queryResult = document.getElementById('queryResult');

    if (!result || result.length === 0) {
        resultContent.innerHTML = '<div style="color: var(--text-secondary); padding: 12px; text-align: center;">(0 rows)</div>';
    } else {
        let html = '<table><thead><tr>';

        // Get columns from first row
        const keys = Object.keys(result[0]);
        keys.forEach(key => {
            html += `<th>${escapeHtml(String(key))}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Limit display to 1000 rows for performance
        const displayRows = result.slice(0, 1000);
        displayRows.forEach(row => {
            html += '<tr>';
            keys.forEach(key => {
                const value = row[key];
                const displayValue = value === null || value === undefined ? 'NULL' : String(value);
                html += `<td>${escapeHtml(displayValue)}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';

        // Add row count
        if (result.length > displayRows.length) {
            html += `<div style="color: var(--text-secondary); padding: 8px; font-size: 11px; margin-top: 8px;">Showing ${displayRows.length} of ${result.length} rows</div>`;
        } else {
            html += `<div style="color: var(--text-secondary); padding: 8px; font-size: 11px; margin-top: 8px;">${result.length} row${result.length !== 1 ? 's' : ''}</div>`;
        }

        resultContent.innerHTML = html;
    }

    queryResult.classList.remove('hide');
}

function exportToCSV() {
    const data = getFilteredData();
    if (data.length === 0) {
        showStatus('No data to export', 'error');
        return;
    }

    let csv = selectedColumns.map(col => `"${col.replace(/"/g, '""')}"`).join(',') + '\n';

    data.forEach(row => {
        csv += selectedColumns.map(col => {
            const value = row[col];
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',') + '\n';
    });

    downloadFile(csv, 'data.csv', 'text/csv');
}

function exportToJSON() {
    const data = getFilteredData();
    if (data.length === 0) {
        showStatus('No data to export', 'error');
        return;
    }

    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'data.json', 'application/json');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus(`Exported as ${filename}`, 'success');
}

function clearInput() {
    document.getElementById('jsonInput').value = '';
    document.getElementById('fileInput').value = '';
    jsonData = null;
    parsedData = [];
    selectedColumns = [];
    allColumns = [];
    filters = [];
    document.getElementById('tableContainer').classList.add('hide');
    document.getElementById('noData').classList.add('hide');
    document.getElementById('columnSelector').classList.add('hide');
    document.getElementById('filterControls').classList.add('hide');
    document.getElementById('pgliteSection').classList.add('hide');
    document.getElementById('detailsEmpty').classList.remove('hide');
    document.getElementById('detailsStatusMessage').classList.remove('show');
}
