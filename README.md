# QueryJSON

> Transform, query, and explore JSON data entirely in your browser. No backend, no data uploads - 100% private and secure.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/dinesh-it/queryjson)](https://github.com/dinesh-it/queryjson/issues)
[![GitHub Stars](https://img.shields.io/github/stars/dinesh-it/queryjson)](https://github.com/dinesh-it/queryjson/stargazers)

## ✨ What is QueryJSON?

QueryJSON is a privacy-first, browser-based tool for working with JSON data. Run SQL queries, filter, sort, and export - all without sending your data anywhere. Perfect for developers, data analysts, and anyone who works with JSON.

**🔒 Privacy First:** All processing happens in your browser. Your data never leaves your device.

## 🚀 Key Features

- **SQL Queries** - Run full PostgreSQL queries on JSON using PGLite (PostgreSQL in the browser)
- **JSON to Table** - Automatically converts nested JSON to flat tables
- **Advanced Filtering** - Multiple operators: contains, equals, greater than, less than, etc.
- **Real-time Search** - Instant search across all columns
- **Column Management** - Drag & drop to reorder, show/hide columns
- **Export Data** - Download as CSV or JSON
- **Zero Setup** - No installation, no dependencies, just open and use
- **100% Client-Side** - Your data stays private, nothing sent to servers
- **Responsive Design** - Works on desktop, tablet, and mobile

## 📸 Screenshot

![QueryJSON Screenshot](docs/screenshot.png)

## 🎯 Use Cases

- Explore and analyze JSON API responses
- Convert JSON to CSV for Excel/Google Sheets
- Practice SQL queries on sample data
- Parse and query JSON logs
- Validate and transform data structures
- Understand complex nested JSON

## 🏃 Quick Start

### Try it Online

Visit **[queryjson.com](https://queryjson.com)** (when deployed)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/dinesh-it/queryjson.git
cd queryjson

# Start a server (choose one)
python3 -m http.server 8000
# OR
npx http-server -p 8000

# Open http://localhost:8000
```

No build process, no dependencies to install!

## 💡 Usage Example

**1. Paste your JSON:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com", "salary": 95000 },
    { "id": 2, "name": "Bob", "email": "bob@example.com", "salary": 75000 }
  ]
}
```

**2. Click "Parse"** - See your data as a table

**3. Run SQL queries:**
```sql
-- Basic filtering
SELECT * FROM json_data WHERE salary > 80000;

-- Aggregations
SELECT department, AVG(salary) as avg_salary, COUNT(*) as count
FROM json_data
GROUP BY department;

-- Sorting and limiting
SELECT name, email FROM json_data ORDER BY salary DESC LIMIT 10;

-- Pattern matching
SELECT * FROM json_data WHERE email LIKE '%@example.com';

-- Complex queries with subqueries and CTEs
SELECT * FROM json_data
WHERE salary > (SELECT AVG(salary) FROM json_data);
```

**Keyboard Shortcut:** Press `Ctrl+Enter` (or `Cmd+Enter` on Mac) to execute queries

**4. Filter, search, and export** - Use the UI controls or export to CSV/JSON

## 🔒 Privacy & Security

**Your data is completely private:**
- ✅ All processing happens in your browser (client-side only)
- ✅ No data is sent to any server
- ✅ No tracking or analytics
- ✅ No account required
- ✅ Safe to use with sensitive data

**How it works:**
- Uses [Thanks to PGLite](https://pglite.dev/) - PostgreSQL compiled to WebAssembly
- Runs entirely in your browser's memory
- Data is never uploaded or stored remotely

## 🛠️ Technology

- **Pure JavaScript** - No frameworks, fast and lightweight
- **PGLite** - PostgreSQL in the browser via WebAssembly
- **Modern CSS** - Responsive, VS Code-inspired dark theme
- **Zero Dependencies** - No build tools required

## 📱 Browser Compatibility

**Fully Supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Requirements:**
- WebAssembly support
- ES6+ JavaScript
- CSS Grid

## ⚡ Performance

- **Small datasets** (< 1,000 rows): Instant
- **Medium datasets** (1,000 - 10,000 rows): Very fast
- **Large datasets** (10,000 - 100,000 rows): Good performance
- **Very large datasets** (> 100,000 rows): May experience slowdowns

**Tip:** Use SQL LIMIT clauses and filters for better performance with large datasets.

## 💡 Tips & Features

### Filter Operators
- **Contains** - Case-insensitive text search
- **Equals** - Exact match
- **Starts with** / **Ends with** - Text patterns
- **Greater than** / **Less than** - Numeric comparisons
- **Greater or equal (≥)** / **Less or equal (≤)** - Inclusive comparisons

### Column Management
- Drag & drop to reorder columns
- Show/hide columns with checkboxes
- Select/deselect all columns at once

### Export Options
- **CSV Export** - Compatible with Excel and Google Sheets
- **JSON Export** - Pretty-formatted for easy reading
- Only selected columns are exported

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick links:**
- Report bugs via [GitHub Issues](https://github.com/dinesh-it/queryjson/issues)
- Suggest features via [GitHub Issues](https://github.com/dinesh-it/queryjson/issues)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 💖 Support

If QueryJSON helped you:
- ⭐ Star the project on GitHub
- 📣 Share with colleagues and friends
- ☕ [Buy me a coffee](https://www.buymeacoffee.com/dineshd)

## 📧 Contact

**Author:** Dinesh D
**GitHub:** [@dinesh-it](https://github.com/dinesh-it)

---

**Made with ❤️ by Dinesh D** | [⬆ back to top](#queryjson)
