// Global state
let jsonData = null;
let parsedData = [];
let allColumns = [];
let selectedColumns = [];
let filters = [];
let pgliteDB = null;
let sortConfig = { column: null, direction: 'asc' };
let displayMode = 'grouped'; // 'grouped' or 'flattened'
let isComplexStructure = false;
let hierarchicalData = null; // Stores hierarchical structure with parent-child relationships
let tableMetadata = []; // Stores metadata about all created tables for PGLite

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

    // JSONPath Query keyboard shortcut (Ctrl+Enter) and auto-expand
    const jsonpathQuery = document.getElementById('jsonpathQuery');
    if (jsonpathQuery) {
        jsonpathQuery.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                executeJSONPathQuery();
            }
        });

        // Auto-expand textarea as user types
        jsonpathQuery.addEventListener('input', function() {
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

function showStatus(message, type = 'success', persistent = false) {
    const statusEl = document.getElementById('detailsStatusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;

    if (type !== 'error' && !persistent) {
        setTimeout(() => {
            statusEl.classList.remove('show');
        }, 3000);
    }
}

function parseJSON() {
    // Show loading overlay
    showLoader();

    // Use setTimeout to allow the loader to render before blocking processing
    setTimeout(() => {
        try {
            const input = document.getElementById('jsonInput').value.trim();

            if (!input) {
                hideLoader();
                showStatus('Please paste or upload JSON/XML/CSV data', 'error');
                return;
            }

            // Check if input is XML
            if (input.startsWith('<?xml') || input.startsWith('<')) {
                parseXML(input);
                return;
            }

            // Check if input is CSV (contains commas and doesn't start with { or [)
            if (!input.startsWith('{') && !input.startsWith('[') && (input.includes(',') || input.includes('\t'))) {
                parseCSV(input);
                return;
            }

            jsonData = JSON.parse(input);

            // Detect if structure is complex and show display mode selector
            isComplexStructure = detectComplexStructure(jsonData);
            const displayModeSelector = document.getElementById('displayModeSelector');
            if (isComplexStructure) {
                displayModeSelector.classList.remove('hide');
            } else {
                displayModeSelector.classList.add('hide');
            }

            // Clear any existing filters when parsing new data
            filters = [];

            // Normalize data to array of objects
            normalizeData();

            // Detect structure
            detectStructure();

            // Build column list
            buildColumns();

            // Clear filter UI
            renderFilters();
            toggleApplyButton();

            // Build table
            buildTable();

            // Initialize PGLite
            initializePGLite();

            hideLoader();
            showStatus('JSON parsed successfully! ' + parsedData.length + ' records found.', 'success');
        } catch (error) {
            hideLoader();
            showStatus('Invalid JSON: ' + error.message, 'error');
        }
    }, 50);
}

function parseXML(xmlString) {
    try {
        // Parse XML using native browser DOMParser
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        // Check for parsing errors
        const parserError = xmlDoc.getElementsByTagName('parsererror');
        if (parserError.length > 0) {
            hideLoader();
            throw new Error('XML parsing error: ' + parserError[0].textContent);
        }

        // Convert XML DOM to JSON
        jsonData = xmlToJson(xmlDoc);

        // Update the input textarea to show the converted JSON
        document.getElementById('jsonInput').value = JSON.stringify(jsonData, null, 2);

        // Clear any existing filters when parsing new data
        filters = [];

        // Normalize data to array of objects
        normalizeData();

        // Detect structure
        detectStructure();

        // Build column list
        buildColumns();

        // Clear filter UI
        renderFilters();
        toggleApplyButton();

        // Build table
        buildTable();

        // Initialize PGLite
        initializePGLite();

        hideLoader();
        showStatus('XML converted and parsed successfully! ' + parsedData.length + ' records found.', 'success');
    } catch (error) {
        hideLoader();
        showStatus('Invalid XML: ' + error.message, 'error');
    }
}

function xmlToJson(xml) {
    // Create the return object
    let obj = {};

    if (xml.nodeType === 1) { // element node
        // Handle attributes
        if (xml.attributes.length > 0) {
            for (let j = 0; j < xml.attributes.length; j++) {
                const attribute = xml.attributes.item(j);
                obj[attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType === 3) { // text node
        obj = xml.nodeValue.trim();
    }

    // Handle child nodes
    if (xml.hasChildNodes()) {
        for (let i = 0; i < xml.childNodes.length; i++) {
            const item = xml.childNodes.item(i);
            const nodeName = item.nodeName;

            // Skip text nodes that are just whitespace
            if (item.nodeType === 3) {
                const text = item.nodeValue.trim();
                if (text) {
                    // If we already have properties, add text as 'value'
                    if (Object.keys(obj).length > 0) {
                        obj['value'] = text;
                    } else {
                        return text;
                    }
                }
                continue;
            }

            if (typeof obj[nodeName] === 'undefined') {
                const converted = xmlToJson(item);
                obj[nodeName] = converted;
            } else {
                // If this node name already exists, convert to array
                if (!Array.isArray(obj[nodeName])) {
                    obj[nodeName] = [obj[nodeName]];
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }

    return obj;
}

function parseCSV(csvString) {
    try {
        // Parse CSV to array of objects
        const rows = csvString.split('\n').filter(row => row.trim());

        if (rows.length === 0) {
            hideLoader();
            throw new Error('CSV data is empty');
        }

        // Detect delimiter (comma, semicolon, or tab)
        const firstRow = rows[0];
        let delimiter = ',';
        if (firstRow.includes('\t')) {
            delimiter = '\t';
        } else if (firstRow.includes(';') && firstRow.split(';').length > firstRow.split(',').length) {
            delimiter = ';';
        }

        // Parse header row
        const headers = parseCSVRow(rows[0], delimiter);

        // Parse data rows
        const data = [];
        for (let i = 1; i < rows.length; i++) {
            const values = parseCSVRow(rows[i], delimiter);
            if (values.length === 0 || (values.length === 1 && values[0] === '')) {
                continue; // Skip empty rows
            }

            const obj = {};
            headers.forEach((header, index) => {
                let value = values[index] || '';
                // Try to convert to number if it looks like a number
                if (value !== '' && !isNaN(value) && value.trim() !== '') {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                        value = num;
                    }
                }
                obj[header] = value;
            });
            data.push(obj);
        }

        jsonData = { data: data };

        // Update the input textarea to show the converted JSON
        document.getElementById('jsonInput').value = JSON.stringify(jsonData, null, 2);

        // Clear any existing filters when parsing new data
        filters = [];

        // Normalize data to array of objects
        normalizeData();

        // Detect structure
        detectStructure();

        // Build column list
        buildColumns();

        // Clear filter UI
        renderFilters();
        toggleApplyButton();

        // Build table
        buildTable();

        // Initialize PGLite
        initializePGLite();

        hideLoader();
        showStatus('CSV converted and parsed successfully! ' + parsedData.length + ' records found.', 'success');
    } catch (error) {
        hideLoader();
        showStatus('Invalid CSV: ' + error.message, 'error');
    }
}

function parseCSVRow(row, delimiter) {
    // Simple CSV parser that handles quoted fields
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    // Add last field
    result.push(current.trim());

    return result;
}

function normalizeData() {
    // Check if data has arrays
    const hasArrays = containsArrays(jsonData);

    if (!hasArrays) {
        // No arrays at all - use flattened mode regardless of displayMode
        hierarchicalData = null;
        // Step 1: Flatten all paths to leaf values
        const flatPaths = flattenToLeafPaths(jsonData);

        // Step 2: Convert to CSV-like format
        const csvRows = pathsToCSV(flatPaths);

        // Step 3: Parse CSV to rows with smart column grouping
        parsedData = csvToRows(csvRows);
    } else if (displayMode === 'grouped') {
        // Has arrays - detect if we have hierarchical structure with multiple nested arrays
        const structure = analyzeStructure(jsonData);

        if (structure.hasMultipleNestedArrays) {
            // Build hierarchical data structure
            hierarchicalData = buildHierarchicalData(jsonData, structure);
            // For initial display, show parent table
            parsedData = hierarchicalData.parent.data;
        } else {
            // Simple structure - use existing logic
            hierarchicalData = null;
            parsedData = normalizeDataGrouped(jsonData);
        }
    } else {
        // Fully flattened mode explicitly selected
        hierarchicalData = null;
        // Step 1: Flatten all paths to leaf values
        const flatPaths = flattenToLeafPaths(jsonData);

        // Step 2: Convert to CSV-like format
        const csvRows = pathsToCSV(flatPaths);

        // Step 3: Parse CSV to rows with smart column grouping
        parsedData = csvToRows(csvRows);
    }
}

// Analyze JSON structure to detect multiple nested arrays
function analyzeStructure(obj, path = '', depth = 0) {
    const result = {
        hasMultipleNestedArrays: false,
        nestedArrays: [], // [{path, parentPath, name}]
        rootArray: null
    };

    // Unwrap single-key wrapper objects ONLY if they contain arrays
    let unwrappedObj = obj;
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && path === '') {
        const keys = Object.keys(obj);
        if (keys.length === 1) {
            const value = obj[keys[0]];
            // Only unwrap if it contains arrays
            if (Array.isArray(value) || (typeof value === 'object' && value !== null && containsArrays(value))) {
                unwrappedObj = value;
            }
        }
    }

    if (Array.isArray(unwrappedObj)) {
        result.rootArray = path || 'root';

        // Check items in the array for nested arrays
        if (unwrappedObj.length > 0 && typeof unwrappedObj[0] === 'object' && unwrappedObj[0] !== null) {
            const nestedArraysInItem = [];

            for (const [key, value] of Object.entries(unwrappedObj[0])) {
                if (Array.isArray(value)) {
                    nestedArraysInItem.push(key);
                } else if (typeof value === 'object' && value !== null) {
                    // Check for wrapper objects containing arrays
                    const subKeys = Object.keys(value);
                    if (subKeys.length === 1 && Array.isArray(value[subKeys[0]])) {
                        nestedArraysInItem.push(key);
                    } else if (Object.values(value).some(v => Array.isArray(v))) {
                        nestedArraysInItem.push(key);
                    }
                }
            }

            if (nestedArraysInItem.length > 1) {
                result.hasMultipleNestedArrays = true;
            }

            // Recursively find all nested arrays
            for (const [key, value] of Object.entries(unwrappedObj[0])) {
                if (typeof value === 'object' && value !== null) {
                    const childResult = analyzeStructure(value, key, depth + 1);
                    result.nestedArrays.push(...childResult.nestedArrays);

                    if (Array.isArray(value)) {
                        result.nestedArrays.push({
                            path: key,
                            parentPath: path || 'root',
                            name: key,
                            depth: depth + 1
                        });
                    }
                }
            }
        }
    } else if (typeof unwrappedObj === 'object' && unwrappedObj !== null) {
        // Check for multiple array properties at this level
        const arrayProps = Object.entries(unwrappedObj).filter(([k, v]) => Array.isArray(v));

        if (arrayProps.length > 1) {
            result.hasMultipleNestedArrays = true;
        }

        for (const [key, value] of Object.entries(unwrappedObj)) {
            if (typeof value === 'object' && value !== null) {
                const childResult = analyzeStructure(value, path ? `${path}.${key}` : key, depth + 1);

                if (childResult.hasMultipleNestedArrays) {
                    result.hasMultipleNestedArrays = true;
                }

                result.nestedArrays.push(...childResult.nestedArrays);

                if (childResult.rootArray) {
                    result.nestedArrays.push({
                        path: path ? `${path}.${key}` : key,
                        parentPath: path || 'root',
                        name: key,
                        depth: depth + 1
                    });
                }
            }
        }
    }

    return result;
}

// Build hierarchical data structure with parent and child tables
function buildHierarchicalData(obj, structure) {
    const result = {
        parent: { name: 'parent', data: [], tableName: 'parent' },
        children: [] // [{name, tableName, data, parentKey}]
    };

    // Unwrap single-key wrapper objects ONLY if they contain arrays (e.g., {"Profiles": {...}})
    let unwrappedObj = obj;
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        const keys = Object.keys(obj);
        if (keys.length === 1) {
            const value = obj[keys[0]];
            // Only unwrap if it contains arrays
            if (Array.isArray(value) || (typeof value === 'object' && value !== null && containsArrays(value))) {
                unwrappedObj = value;
            }
        }
    }

    // Find the root array
    let rootArray = [];
    let rootKey = '';

    if (Array.isArray(unwrappedObj)) {
        rootArray = unwrappedObj;
        rootKey = 'items';
    } else if (typeof unwrappedObj === 'object' && unwrappedObj !== null) {
        // Find first array in object
        for (const [key, value] of Object.entries(unwrappedObj)) {
            if (Array.isArray(value)) {
                rootArray = value;
                rootKey = key;
                break;
            } else if (typeof value === 'object' && value !== null) {
                // Look one level deeper
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (Array.isArray(subValue)) {
                        rootArray = subValue;
                        rootKey = subKey;
                        break;
                    }
                }
                if (rootArray.length > 0) break;
            }
        }
    }

    if (rootArray.length === 0) {
        // Fallback to simple structure
        result.parent.data = [unwrappedObj];
        return result;
    }

    // Process each item in root array
    rootArray.forEach((item, index) => {
        if (typeof item !== 'object' || item === null) return;

        const parentRow = { _id: index };
        const childArrays = {};

        // Separate parent properties from child arrays
        for (const [key, value] of Object.entries(item)) {
            if (Array.isArray(value)) {
                // This is a child array
                childArrays[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                // Check if this object is a single-key wrapper containing an array
                const subKeys = Object.keys(value);
                if (subKeys.length === 1 && Array.isArray(value[subKeys[0]])) {
                    // Unwrap: e.g., Meters: { Meter: [...] } becomes Meter: [...]
                    childArrays[subKeys[0]] = value[subKeys[0]];
                } else {
                    // Check if this object contains arrays (like Meters.Meter)
                    let hasArrays = false;
                    for (const [subKey, subValue] of Object.entries(value)) {
                        if (Array.isArray(subValue)) {
                            childArrays[subKey] = subValue;
                            hasArrays = true;
                        }
                    }

                    // If no arrays, treat as parent property
                    if (!hasArrays) {
                        flattenObjectProperties(value, key, parentRow, '');
                    }
                }
            } else {
                // Primitive value - add to parent
                parentRow[key] = value;
            }
        }

        result.parent.data.push(parentRow);

        // Process child arrays
        for (const [arrayName, arrayData] of Object.entries(childArrays)) {
            // Find or create child table
            let childTable = result.children.find(c => c.name === arrayName);

            if (!childTable) {
                childTable = {
                    name: arrayName,
                    tableName: toSnakeCase(arrayName),
                    data: [],
                    parentKey: '_parent_id'
                };
                result.children.push(childTable);
            }

            // Add rows to child table
            arrayData.forEach((childItem, childIndex) => {
                const childRow = {
                    _id: childTable.data.length,
                    _parent_id: index
                };

                if (typeof childItem === 'object' && childItem !== null && !Array.isArray(childItem)) {
                    // Flatten child object properties
                    for (const [k, v] of Object.entries(childItem)) {
                        if (!Array.isArray(v) && (typeof v !== 'object' || v === null)) {
                            childRow[k] = v;
                        }
                    }
                } else {
                    childRow.value = childItem;
                }

                childTable.data.push(childRow);
            });
        }
    });

    // Set table name for parent based on root key
    result.parent.tableName = toSnakeCase(rootKey) || 'parent';

    return result;
}

// Convert camelCase or PascalCase to snake_case
function toSnakeCase(str) {
    return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/\s+/g, '_');
}

// Group by deepest array - one row per array element
function normalizeDataGrouped(obj, parentPath = '', parentContext = {}) {
    const results = [];

    // Unwrap single-key wrapper objects ONLY if they contain an array (e.g., {"users": [...]})
    let unwrappedObj = obj;
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && parentPath === '') {
        const keys = Object.keys(obj);
        if (keys.length === 1) {
            const value = obj[keys[0]];
            // Only unwrap if it's an array or contains arrays
            if (Array.isArray(value)) {
                unwrappedObj = value;
            } else if (typeof value === 'object' && value !== null) {
                // Check if this object has any arrays (directly or nested)
                const hasArrays = containsArrays(value);
                if (hasArrays) {
                    unwrappedObj = value;
                }
            }
        }
    }

    if (Array.isArray(unwrappedObj)) {
        // Found an array - create rows for each element
        unwrappedObj.forEach((item, index) => {
            const indexColumn = `${parentPath}_Index`;
            const context = { ...parentContext, [indexColumn]: index };

            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                // Object in array - flatten its properties
                const row = { ...context };
                flattenObjectProperties(item, '', row, parentPath);

                // Check if this object has nested arrays
                const nestedResults = findAndProcessNestedArrays(item, parentPath, row);

                if (nestedResults.length > 0) {
                    results.push(...nestedResults);
                } else {
                    results.push(row);
                }
            } else if (Array.isArray(item)) {
                // Nested array - recurse
                const nested = normalizeDataGrouped(item, parentPath, context);
                results.push(...nested);
            } else {
                // Primitive in array
                context[`${parentPath}_Value`] = item;
                results.push(context);
            }
        });
    } else if (typeof unwrappedObj === 'object' && unwrappedObj !== null) {
        // Object at root - look for arrays inside
        const hasArrays = Object.values(unwrappedObj).some(v => Array.isArray(v) || (typeof v === 'object' && v !== null));

        if (!hasArrays) {
            // No arrays - just return the object as a single row
            const row = {};
            flattenObjectProperties(unwrappedObj, '', row, '');
            results.push(row);
        } else {
            // Has arrays - process them
            for (const [key, value] of Object.entries(unwrappedObj)) {
                if (Array.isArray(value)) {
                    const nested = normalizeDataGrouped(value, key, parentContext);
                    results.push(...nested);
                } else if (typeof value === 'object' && value !== null) {
                    const nested = normalizeDataGrouped(value, key, parentContext);
                    results.push(...nested);
                }
            }
        }
    }

    return results.length > 0 ? results : [{ Value: unwrappedObj }];
}

function flattenObjectProperties(obj, prefix, row, arrayName) {
    for (const [key, value] of Object.entries(obj)) {
        const colName = prefix ? `${prefix}.${key}` : (arrayName ? `${removeArraySuffix(arrayName)}.${key}` : key);

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Nested object - flatten it
            flattenObjectProperties(value, colName, row, arrayName);
        } else if (!Array.isArray(value)) {
            // Primitive value
            row[colName] = value;
        }
    }
}

function findAndProcessNestedArrays(obj, parentPath, context) {
    const results = [];

    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            // Found a nested array
            const arrayPath = key;
            const nested = normalizeDataGrouped(value, arrayPath, context);
            results.push(...nested);
        } else if (typeof value === 'object' && value !== null) {
            const nested = findAndProcessNestedArrays(value, parentPath, context);
            if (nested.length > 0) {
                results.push(...nested);
            }
        }
    }

    return results;
}

function removeArraySuffix(str) {
    // Remove trailing 's' if it looks like a plural (Meters -> Meter)
    if (str.endsWith('s') && str.length > 2) {
        return str.slice(0, -1);
    }
    return str;
}

// Helper function to check if an object contains arrays at any level
function containsArrays(obj) {
    if (Array.isArray(obj)) return true;
    if (typeof obj !== 'object' || obj === null) return false;

    for (const value of Object.values(obj)) {
        if (Array.isArray(value)) return true;
        if (typeof value === 'object' && value !== null && containsArrays(value)) {
            return true;
        }
    }
    return false;
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
    // Path with arrays: "Profiles.Profile[0].Meters.Meter[1].Service"
    // Value: 8405.09
    const rows = [];

    for (let path in flatPaths) {
        const value = flatPaths[path];

        // Split path by dots AND array indices
        // "Profile[0].Meters.Meter[1].ID" becomes ["Profile", "[0]", "Meters", "Meter", "[1]", "ID"]
        const parts = path.split(/\.|\[/).map(part => {
            // Remove trailing ] from array indices
            return part.endsWith(']') ? '[' + part.slice(0, -1) + ']' : part;
        }).filter(part => part !== '');

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

    // Detect if we have a simple single-root structure
    // Check if all rows start with the same path_0 (root key)
    const rootKeys = new Set();
    csvRows.forEach(row => {
        if (row['path_0'] !== undefined) {
            rootKeys.add(row['path_0']);
        }
    });

    const useSingleRootNaming = rootKeys.size === 1;

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

        // Determine column name based on structure
        let columnName;

        if (useSingleRootNaming) {
            // Smart naming: Skip root container and array indices
            // Build hierarchical path from meaningful names
            const meaningfulPath = [];
            for (let i = 1; i < maxPathDepth; i++) { // Start from 1 to skip root
                const pathPart = row[`path_${i}`];
                if (pathPart !== undefined && !pathPart.match(/^\[\d+\]$/)) {
                    // Skip array indices like [0], [1], etc.
                    meaningfulPath.push(pathPart);
                }
            }

            // Add the metric name at the end
            meaningfulPath.push(row.metric);

            // Create the column name: e.g., "Profile.Meters.Meter.Service"
            columnName = meaningfulPath.join('.');
        } else {
            // Multiple roots: use Level-based naming for clarity
            columnName = row.metric;
        }

        // Store the value with the chosen column name
        grouped[pathKey][columnName] = row.value;
    });

    // Convert grouped object to array
    const result = Object.values(grouped);

    // Clean up and rename path columns
    result.forEach(row => {
        if (useSingleRootNaming) {
            // For single root, we don't need Key columns, just remove paths
            for (let i = 0; i < maxPathDepth; i++) {
                delete row[`path_${i}`];
            }
        } else {
            // For multiple roots, keep Key columns for context (renamed from Level)
            for (let i = 0; i < maxPathDepth; i++) {
                if (row[`path_${i}`] !== undefined) {
                    row[`Key${i + 1}`] = row[`path_${i}`];
                    delete row[`path_${i}`];
                }
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

    // Collect all unique column names from ALL rows, not just the first one
    // This is important for complex nested JSON where different rows may have different properties
    const columnSet = new Set();
    parsedData.forEach(row => {
        if (typeof row === 'object' && row !== null) {
            Object.keys(row).forEach(key => columnSet.add(key));
        }
    });

    allColumns = Array.from(columnSet).sort((a, b) => {
        // Custom sort: Index and Key columns first, then alphabetically
        const aIsKey = a.match(/^Key(\d+)$/);
        const bIsKey = b.match(/^Key(\d+)$/);
        const aIsIndex = a.endsWith('_Index');
        const bIsIndex = b.endsWith('_Index');

        // Index columns come first
        if (aIsIndex && !bIsIndex) return -1;
        if (!aIsIndex && bIsIndex) return 1;

        // Then Key columns
        if (aIsKey && bIsKey) {
            // Both are Key columns, sort by number
            return parseInt(aIsKey[1]) - parseInt(bIsKey[1]);
        } else if (aIsKey) {
            // a is Key, b is not - Key comes first
            return -1;
        } else if (bIsKey) {
            // b is Key, a is not - Key comes first
            return 1;
        } else {
            // Neither are Key columns, sort alphabetically
            return a.localeCompare(b);
        }
    });

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

    // Check if we have hierarchical data
    if (hierarchicalData && hierarchicalData.children.length > 0) {
        buildHierarchicalTable(filteredData);
    } else {
        buildSimpleTable(filteredData);
    }

    tableContainer.classList.remove('hide');
    noDataEl.classList.add('hide');

    // Update stats
    updateStats(filteredData);
    document.getElementById('statsContainer').style.display = 'grid';
}

function buildSimpleTable(filteredData) {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

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
}

function buildHierarchicalTable(filteredData) {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    // Build header with expand column
    tableHead.innerHTML = '';
    const expandTh = document.createElement('th');
    expandTh.style.width = '40px';
    expandTh.textContent = '';
    tableHead.appendChild(expandTh);

    selectedColumns.forEach(col => {
        const th = document.createElement('th');
        th.innerHTML = `${escapeHtml(col)} <span class="sort-indicator">${getSortIndicator(col)}</span>`;
        th.onclick = () => sortTable(col);
        tableHead.appendChild(th);
    });

    // Build body with expandable rows
    tableBody.innerHTML = '';
    filteredData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.rowId = row._id !== undefined ? row._id : rowIndex;

        // Expand button column
        const expandTd = document.createElement('td');
        expandTd.style.textAlign = 'center';
        expandTd.style.cursor = 'pointer';
        expandTd.innerHTML = '<span class="expand-icon">▶</span>';
        expandTd.onclick = () => toggleChildTables(tr, row._id !== undefined ? row._id : rowIndex);
        tr.appendChild(expandTd);

        // Data columns
        selectedColumns.forEach(col => {
            const td = document.createElement('td');
            const value = row[col];
            td.textContent = formatCellValue(value);
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
}

function toggleChildTables(parentRow, parentId) {
    const expandIcon = parentRow.querySelector('.expand-icon');
    const nextRow = parentRow.nextElementSibling;

    // Check if child tables are already shown
    if (nextRow && nextRow.classList.contains('child-tables-row')) {
        // Collapse
        nextRow.remove();
        expandIcon.textContent = '▶';
    } else {
        // Expand
        expandIcon.textContent = '▼';

        // Create child tables row
        const childRow = document.createElement('tr');
        childRow.classList.add('child-tables-row');

        const childTd = document.createElement('td');
        childTd.colSpan = selectedColumns.length + 1;
        childTd.style.padding = '0';
        childTd.style.background = 'var(--bg-secondary)';

        const childContainer = document.createElement('div');
        childContainer.style.padding = '12px';
        childContainer.style.display = 'grid';
        childContainer.style.gap = '16px';

        // Create table for each child array
        hierarchicalData.children.forEach(childTable => {
            const childData = childTable.data.filter(row => row._parent_id === parentId);

            if (childData.length === 0) return;

            const tableWrapper = document.createElement('div');
            tableWrapper.style.border = '1px solid var(--border-color)';
            tableWrapper.style.borderRadius = '4px';
            tableWrapper.style.overflow = 'hidden';

            const tableTitle = document.createElement('div');
            tableTitle.style.padding = '8px 12px';
            tableTitle.style.background = 'var(--bg-tertiary)';
            tableTitle.style.fontWeight = '600';
            tableTitle.style.fontSize = '12px';
            tableTitle.style.borderBottom = '1px solid var(--border-color)';
            tableTitle.textContent = `${childTable.name} (${childData.length} rows)`;

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.fontSize = '11px';

            // Get columns from first row
            const childColumns = Object.keys(childData[0]).filter(k => !k.startsWith('_'));

            // Header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            childColumns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                th.style.padding = '6px 8px';
                th.style.background = 'var(--bg-primary)';
                th.style.borderBottom = '1px solid var(--border-color)';
                th.style.textAlign = 'left';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Body
            const tbody = document.createElement('tbody');
            childData.forEach(childRow => {
                const tr = document.createElement('tr');
                childColumns.forEach(col => {
                    const td = document.createElement('td');
                    td.textContent = formatCellValue(childRow[col]);
                    td.style.padding = '6px 8px';
                    td.style.borderBottom = '1px solid var(--border-color)';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            tableWrapper.appendChild(tableTitle);
            tableWrapper.appendChild(table);
            childContainer.appendChild(tableWrapper);
        });

        childTd.appendChild(childContainer);
        childRow.appendChild(childTd);

        // Insert after parent row
        parentRow.parentNode.insertBefore(childRow, parentRow.nextSibling);
    }
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
                const operatorsNeedingValue = ['equals', 'notequals', 'contains', 'starts', 'ends', 'regex', 'gt', 'lt', 'gte', 'lte'];
                if (operatorsNeedingValue.includes(filter.operator) && filter.value === '') return true;

                // Check parent row first
                const value = row[filter.column];
                const filterVal = filter.value;

                const matchesFilter = (val) => {
                    switch (filter.operator) {
                        case 'equals':
                            return String(val).toLowerCase() === filterVal.toLowerCase();
                        case 'notequals':
                            return String(val).toLowerCase() !== filterVal.toLowerCase();
                        case 'contains':
                            return String(val).toLowerCase().includes(filterVal.toLowerCase());
                        case 'starts':
                            return String(val).toLowerCase().startsWith(filterVal.toLowerCase());
                        case 'ends':
                            return String(val).toLowerCase().endsWith(filterVal.toLowerCase());
                        case 'regex':
                            try {
                                const regex = new RegExp(filterVal, 'i');
                                return regex.test(String(val));
                            } catch (e) {
                                // Invalid regex - show error but don't filter
                                console.warn('Invalid regex pattern:', filterVal, e);
                                return true;
                            }
                        case 'isnull':
                            return val === null || val === undefined || val === '';
                        case 'isnotnull':
                            return val !== null && val !== undefined && val !== '';
                        case 'gt':
                            return Number(val) > Number(filterVal);
                        case 'lt':
                            return Number(val) < Number(filterVal);
                        case 'gte':
                            return Number(val) >= Number(filterVal);
                        case 'lte':
                            return Number(val) <= Number(filterVal);
                        default:
                            return true;
                    }
                };

                // Check parent row
                if (matchesFilter(value)) return true;

                // For hierarchical data, also check child tables
                if (hierarchicalData && hierarchicalData.children.length > 0) {
                    const parentId = row._id !== undefined ? row._id : parsedData.indexOf(row);

                    // Check if any child row matches the filter
                    return hierarchicalData.children.some(childTable => {
                        const childRows = childTable.data.filter(childRow => childRow._parent_id === parentId);
                        return childRows.some(childRow => {
                            const childValue = childRow[filter.column];
                            return childValue !== undefined && matchesFilter(childValue);
                        });
                    });
                }

                return false;
            });
        });
    }

    // Apply search
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(row => {
            // Check parent columns
            const matchesParent = selectedColumns.some(col => {
                return String(row[col]).toLowerCase().includes(searchTerm);
            });

            if (matchesParent) return true;

            // For hierarchical data, also check child tables
            if (hierarchicalData && hierarchicalData.children.length > 0) {
                const parentId = row._id !== undefined ? row._id : parsedData.indexOf(row);

                // Check if any child row matches the search
                return hierarchicalData.children.some(childTable => {
                    const childRows = childTable.data.filter(childRow => childRow._parent_id === parentId);
                    return childRows.some(childRow => {
                        return Object.keys(childRow).some(key => {
                            if (key.startsWith('_')) return false;
                            return String(childRow[key]).toLowerCase().includes(searchTerm);
                        });
                    });
                });
            }

            return false;
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
                <option value="regex" ${filter.operator === 'regex' ? 'selected' : ''}>Regex Match</option>
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

        // Show loading message in the FILTERS pane (persistent until DB is loaded)
        showStatus('Populating records for DB query...', 'info', true);

        // Clear table metadata
        tableMetadata = [];

        // Check if we have hierarchical data
        if (hierarchicalData && hierarchicalData.children.length > 0) {
            await loadHierarchicalDataIntoPGLite();
        } else {
            await loadSimpleDataIntoPGLite();
        }

    } catch (error) {
        console.error('Database reload error:', error);
        showStatus('Failed to load data into database: ' + error.message, 'error');
    }
}

async function loadSimpleDataIntoPGLite() {
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

    tableMetadata = [{
        name: 'json_data',
        rowCount: data.length
    }];

    // Show query section is ready
    document.getElementById('querySection').classList.remove('hide');
    document.getElementById('pgliteNotReady').classList.add('hide');

    // Update query placeholder with table info
    const queryInput = document.getElementById('sqlQuery');
    queryInput.placeholder = `SELECT * FROM json_data LIMIT 10;  -- Use table name: json_data (${data.length} rows)`;

    showStatus('Database loaded with ' + data.length + ' rows', 'success');
}

async function loadHierarchicalDataIntoPGLite() {
    // Drop existing tables
    const tablesToDrop = [hierarchicalData.parent.tableName];
    hierarchicalData.children.forEach(child => tablesToDrop.push(child.tableName));

    for (const tableName of tablesToDrop) {
        try {
            await pgliteDB.query(`DROP TABLE IF EXISTS ${tableName}`);
        } catch (e) {
            // Ignore
        }
    }

    // Create and load parent table
    await createAndLoadTable(
        hierarchicalData.parent.tableName,
        hierarchicalData.parent.data,
        false // no parent ID
    );

    tableMetadata.push({
        name: hierarchicalData.parent.tableName,
        rowCount: hierarchicalData.parent.data.length,
        type: 'parent'
    });

    // Create and load child tables
    for (const childTable of hierarchicalData.children) {
        await createAndLoadTable(
            childTable.tableName,
            childTable.data,
            true // has parent ID
        );

        tableMetadata.push({
            name: childTable.tableName,
            rowCount: childTable.data.length,
            type: 'child',
            parentTable: hierarchicalData.parent.tableName
        });
    }

    // Show query section is ready
    document.getElementById('querySection').classList.remove('hide');
    document.getElementById('pgliteNotReady').classList.add('hide');

    // Update query placeholder with all table names
    const queryInput = document.getElementById('sqlQuery');
    const tableList = tableMetadata.map(t => `${t.name} (${t.rowCount} rows)`).join(', ');
    queryInput.placeholder = `SELECT * FROM ${hierarchicalData.parent.tableName} LIMIT 10;\n-- Available tables: ${tableList}`;

    // Update available tables info UI
    updateAvailableTablesUI();

    const totalRows = tableMetadata.reduce((sum, t) => sum + t.rowCount, 0);
    showStatus(`Database loaded with ${tableMetadata.length} tables, ${totalRows} total rows`, 'success');
}

function updateAvailableTablesUI() {
    const tablesInfo = document.getElementById('availableTablesInfo');
    const tablesList = document.getElementById('tablesList');
    const joinExamples = document.getElementById('joinExamples');

    if (tableMetadata.length > 1) {
        // Show available tables section
        tablesInfo.style.display = 'block';

        // Build tables list
        let tablesHTML = '';
        const parentTable = tableMetadata.find(t => t.type === 'parent');
        const childTables = tableMetadata.filter(t => t.type === 'child');

        if (parentTable) {
            tablesHTML += `<div>• <strong>${parentTable.name}</strong> (${parentTable.rowCount} rows) - Parent table</div>`;
        }

        childTables.forEach(child => {
            tablesHTML += `<div>• <strong>${child.name}</strong> (${child.rowCount} rows) - Child of ${child.parentTable}</div>`;
        });

        tablesList.innerHTML = tablesHTML;

        // Show join examples
        if (parentTable && childTables.length > 0) {
            joinExamples.style.display = 'block';
            const firstChild = childTables[0];

            document.getElementById('joinExample1').textContent =
                `SELECT * FROM ${parentTable.name} p JOIN ${firstChild.name} c ON p._id = c._parent_id`;

            if (childTables.length > 1) {
                const secondChild = childTables[1];
                document.getElementById('joinExample2').textContent =
                    `SELECT p.*, c1.*, c2.* FROM ${parentTable.name} p JOIN ${firstChild.name} c1 ON p._id = c1._parent_id JOIN ${secondChild.name} c2 ON p._id = c2._parent_id`;
            }
        }
    } else {
        // Hide for simple single table
        tablesInfo.style.display = 'none';
        joinExamples.style.display = 'none';
    }
}

async function createAndLoadTable(tableName, data, hasParentId) {
    if (data.length === 0) return;

    // Get all columns from all rows (some rows might have different columns)
    const allCols = new Set();
    data.forEach(row => {
        Object.keys(row).forEach(key => allCols.add(key));
    });

    const columns = Array.from(allCols).map(col => {
        // Find a sample value for type detection
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

    // Create table
    const createTableSQL = `CREATE TABLE ${tableName} (${columns})`;
    await pgliteDB.query(createTableSQL);

    // Insert data
    const colNames = Array.from(allCols);
    const insertCols = colNames.map(col => `"${col}"`).join(', ');
    const placeholders = colNames.map((_, i) => `$${i + 1}`).join(', ');
    const insertSQL = `INSERT INTO ${tableName} (${insertCols}) VALUES (${placeholders})`;

    for (const row of data) {
        const values = colNames.map(col => {
            const val = row[col];
            return val === null || val === undefined ? null : val;
        });
        try {
            await pgliteDB.query(insertSQL, values);
        } catch (e) {
            console.warn('Row insert error:', e);
        }
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

function switchQueryMode(mode) {
    // Update button states
    document.querySelectorAll('.query-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    // Show/hide appropriate sections
    if (mode === 'sql') {
        document.getElementById('sqlSection').classList.remove('hide');
        document.getElementById('jsonpathSection').classList.add('hide');
    } else if (mode === 'jsonpath') {
        document.getElementById('sqlSection').classList.add('hide');
        document.getElementById('jsonpathSection').classList.remove('hide');
    }

    // Clear any previous errors
    document.getElementById('queryError').classList.add('hide');
    document.getElementById('queryError').textContent = '';
}

function executeJSONPathQuery() {
    const queryErrorEl = document.getElementById('queryError');

    // Clear any previous error
    queryErrorEl.classList.add('hide');
    queryErrorEl.textContent = '';

    try {
        if (!jsonData) {
            showQueryError('No JSON data loaded. Please parse JSON first.');
            return;
        }

        const query = document.getElementById('jsonpathQuery').value.trim();
        if (!query) {
            showQueryError('Please enter a JSONPath query');
            return;
        }

        // Check if JSONPath library is available
        if (!window.jsonpath) {
            showQueryError('JSONPath library not loaded. Please refresh the page.');
            console.error('window.jsonpath is not available. Available:', Object.keys(window).filter(k => k.toLowerCase().includes('json')));
            return;
        }

        // Execute JSONPath query
        try {
            // Using jsonpath library (lowercase) - it exports jsonpath.query()
            const result = window.jsonpath.query(jsonData, query);

            // Handle result
            if (!result || result.length === 0) {
                displayQueryResult([]);
                showStatus('Query executed successfully (0 results)', 'success');
            } else {
                // Normalize result to array of objects for table display
                const normalizedResult = normalizeJSONPathResult(result);
                displayQueryResult(normalizedResult);
                showStatus(`Query executed successfully (${normalizedResult.length} results)`, 'success');
            }

            // Scroll to results on success
            setTimeout(() => {
                document.getElementById('queryResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (e) {
            document.getElementById('queryResult').classList.add('hide');
            showQueryError('JSONPath query error: ' + e.message);
        }

    } catch (error) {
        document.getElementById('queryResult').classList.add('hide');
        showQueryError('Query error: ' + error.message);
    }
}

function normalizeJSONPathResult(result) {
    // If result is already an array of objects, return as is
    if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && result[0] !== null && !Array.isArray(result[0])) {
        return result;
    }

    // If result is a single object, wrap it in an array
    if (!Array.isArray(result) && typeof result === 'object' && result !== null) {
        return [result];
    }

    // If result is an array of primitives or mixed types, convert to objects
    if (Array.isArray(result)) {
        return result.map((item, index) => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                return item;
            }
            return { index: index, value: item };
        });
    }

    // Single primitive value
    return [{ value: result }];
}

function showQueryError(message) {
    const queryErrorEl = document.getElementById('queryError');
    const queryPanel = document.getElementById('queryPanel');
    const querySection = document.getElementById('querySection');

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

    // Show the query section if hidden
    if (querySection && querySection.classList.contains('hide')) {
        querySection.classList.remove('hide');
    }

    // Scroll to the error message
    setTimeout(() => {
        queryErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Store query results globally for export functionality
let currentQueryResults = null;

function displayQueryResult(result) {
    const resultContent = document.getElementById('resultContent');
    const queryResult = document.getElementById('queryResult');

    // Store results for export functionality
    currentQueryResults = result;

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

function copyAsMarkdown() {
    const data = getFilteredData();
    if (data.length === 0) {
        showStatus('No data to copy', 'error');
        return;
    }

    // Generate GitHub Flavored Markdown table
    let markdown = '';

    // Header row
    markdown += '| ' + selectedColumns.join(' | ') + ' |\n';

    // Separator row with alignment
    markdown += '| ' + selectedColumns.map(() => '---').join(' | ') + ' |\n';

    // Data rows
    data.forEach(row => {
        const rowValues = selectedColumns.map(col => {
            const value = row[col];
            // Escape pipe characters and handle null/undefined
            if (value === null || value === undefined) return '';
            return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
        });
        markdown += '| ' + rowValues.join(' | ') + ' |\n';
    });

    copyToClipboard(markdown, 'Markdown table copied to clipboard!');
}

function copyAsJSON() {
    const data = getFilteredData();
    if (data.length === 0) {
        showStatus('No data to copy', 'error');
        return;
    }

    const json = JSON.stringify(data, null, 2);
    copyToClipboard(json, 'JSON copied to clipboard!');
}

function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showStatus(successMessage, 'success');
            })
            .catch(err => {
                console.error('Failed to copy to clipboard:', err);
                showStatus('Failed to copy to clipboard', 'error');
            });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showStatus(successMessage, 'success');
            } else {
                showStatus('Failed to copy to clipboard', 'error');
            }
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            showStatus('Failed to copy to clipboard', 'error');
        }

        document.body.removeChild(textArea);
    }
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
    document.getElementById('querySection').classList.add('hide');
    document.getElementById('detailsEmpty').classList.remove('hide');
    document.getElementById('detailsStatusMessage').classList.remove('show');

    // Clear filter UI
    renderFilters();
    toggleApplyButton();

    // Reset stats
    document.getElementById('statRows').textContent = '0';
    document.getElementById('statColumns').textContent = '0';
    document.getElementById('statFiltered').textContent = '0';
    document.getElementById('statsContainer').style.display = 'none';
}

// Loading Overlay Functions
function showLoader() {
    document.getElementById('loadingOverlay').style.display = 'block';
}

function hideLoader() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Modal Functions
function openHelpModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.getElementById('helpModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeHelpModal() {
    document.getElementById('helpModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openFAQModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.getElementById('faqModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeFAQModal() {
    document.getElementById('faqModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const helpModal = document.getElementById('helpModal');
    const faqModal = document.getElementById('faqModal');

    if (event.target === helpModal) {
        closeHelpModal();
    } else if (event.target === faqModal) {
        closeFAQModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeHelpModal();
        closeFAQModal();
    }
});

// Display Mode Functions
function detectComplexStructure(obj, depth = 0, arrayDepth = 0) {
    // Detect if JSON has complex nested structure (multiple nested arrays)
    // Use the same logic as analyzeStructure
    const structure = analyzeStructure(obj);
    return structure.hasMultipleNestedArrays;
}

function changeDisplayMode() {
    const selectedMode = document.querySelector('input[name="displayMode"]:checked').value;
    displayMode = selectedMode;

    // Re-process the data with new display mode
    if (jsonData) {
        normalizeData();
        detectStructure();
        buildColumns();
        buildTable();

        // Update PGLite
        if (pgliteDB && parsedData.length > 0) {
            loadDataIntoPGLite();
        }
    }
}

// Query Result Export Functions
function exportQueryToCSV() {
    if (!currentQueryResults || currentQueryResults.length === 0) {
        showStatus('No query results to export', 'error');
        return;
    }

    const keys = Object.keys(currentQueryResults[0]);
    let csv = keys.map(col => `"${col.replace(/"/g, '""')}"`).join(',') + '\n';

    currentQueryResults.forEach(row => {
        csv += keys.map(key => {
            const value = row[key];
            const escaped = String(value === null || value === undefined ? '' : value).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',') + '\n';
    });

    downloadFile(csv, 'query-results.csv', 'text/csv');
}

function exportQueryToJSON() {
    if (!currentQueryResults || currentQueryResults.length === 0) {
        showStatus('No query results to export', 'error');
        return;
    }

    const json = JSON.stringify(currentQueryResults, null, 2);
    downloadFile(json, 'query-results.json', 'application/json');
}

function copyQueryAsJSON() {
    if (!currentQueryResults || currentQueryResults.length === 0) {
        showStatus('No query results to copy', 'error');
        return;
    }

    const json = JSON.stringify(currentQueryResults, null, 2);
    copyToClipboard(json, 'Query results JSON copied to clipboard!');
}

function copyQueryAsMarkdown() {
    if (!currentQueryResults || currentQueryResults.length === 0) {
        showStatus('No query results to copy', 'error');
        return;
    }

    const keys = Object.keys(currentQueryResults[0]);

    // Generate GitHub Flavored Markdown table
    let markdown = '';

    // Header row
    markdown += '| ' + keys.join(' | ') + ' |\n';

    // Separator row with alignment
    markdown += '| ' + keys.map(() => '---').join(' | ') + ' |\n';

    // Data rows
    currentQueryResults.forEach(row => {
        const rowValues = keys.map(key => {
            const value = row[key];
            // Escape pipe characters and handle null/undefined
            if (value === null || value === undefined) return 'NULL';
            return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
        });
        markdown += '| ' + rowValues.join(' | ') + ' |\n';
    });

    copyToClipboard(markdown, 'Query results Markdown table copied to clipboard!');
}
