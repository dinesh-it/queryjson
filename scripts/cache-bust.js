#!/usr/bin/env node

/**
 * Cache busting script - automatically adds content hash to static files
 * Run this after minification to update HTML with versioned assets
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Configuration
const HTML_FILE = path.join(__dirname, '../index.html');
const FILES_TO_HASH = [
    { path: 'static/js/app.min.js', pattern: /static\/js\/app\.min\.js(\?v=[^"]+)?/g },
    { path: 'static/css/styles.min.css', pattern: /static\/css\/styles\.min\.css(\?v=[^"]+)?/g }
];

/**
 * Generate hash from file content
 */
function getFileHash(filePath) {
    const absolutePath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(absolutePath)) {
        console.warn(`Warning: File not found - ${filePath}`);
        return Date.now().toString(); // Fallback to timestamp
    }

    const fileContent = fs.readFileSync(absolutePath);
    const hash = crypto.createHash('md5').update(fileContent).digest('hex');
    return hash.substring(0, 8); // Use first 8 characters
}

/**
 * Update HTML file with versioned assets
 */
function updateHtmlWithVersions() {
    let htmlContent = fs.readFileSync(HTML_FILE, 'utf8');
    let hasChanges = false;

    FILES_TO_HASH.forEach(file => {
        const hash = getFileHash(file.path);
        const replacement = `${file.path}?v=${hash}`;

        if (htmlContent.match(file.pattern)) {
            htmlContent = htmlContent.replace(file.pattern, replacement);
            hasChanges = true;
            console.log(`✓ Updated ${file.path} with hash ${hash}`);
        } else {
            console.warn(`✗ Pattern not found for ${file.path}`);
        }
    });

    if (hasChanges) {
        fs.writeFileSync(HTML_FILE, htmlContent, 'utf8');
        console.log('\n✓ Cache busting complete! HTML file updated.');
    } else {
        console.log('\n✗ No changes made to HTML file.');
    }
}

// Run the script
try {
    console.log('Starting cache busting...\n');
    updateHtmlWithVersions();
} catch (error) {
    console.error('Error during cache busting:', error);
    process.exit(1);
}
