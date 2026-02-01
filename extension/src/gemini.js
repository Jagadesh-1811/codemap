const { GoogleGenerativeAI } = require('@google/generative-ai');
const vscode = require('vscode');

let genAI = null;
let model = null;
let secretStorage = null;

// Rate limit tracking
let rateLimitUntil = 0;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

/**
 * Check if we're currently rate limited
 */
function isRateLimited() {
    if (Date.now() < rateLimitUntil) {
        return true;
    }
    return false;
}

/**
 * Set rate limit cooldown
 * @param {number} seconds - Seconds to wait
 */
function setRateLimitCooldown(seconds) {
    rateLimitUntil = Date.now() + (seconds * 1000);
    console.log(`Rate limited. Cooling down for ${seconds}s`);
}

/**
 * Set the secret storage instance from extension context
 * @param {vscode.SecretStorage} storage 
 */
function setSecretStorage(storage) {
    secretStorage = storage;
}

/**
 * Save API key securely
 * @param {string} apiKey 
 */
async function saveApiKey(apiKey) {
    if (secretStorage) {
        await secretStorage.store('geminiApiKey', apiKey);
        // Reset rate limit on new API key
        rateLimitUntil = 0;
        consecutiveErrors = 0;
        return true;
    }
    return false;
}

/**
 * Get API key from secure storage
 */
async function getApiKey() {
    if (secretStorage) {
        return await secretStorage.get('geminiApiKey');
    }
    return null;
}

/**
 * Initialize Gemini API with API key
 */
async function initializeGemini() {
    const apiKey = await getApiKey();

    if (!apiKey) {
        return false;
    }

    try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        return true;
    } catch (error) {
        console.error('Failed to initialize Gemini:', error);
        return false;
    }
}

/**
 * Generate AI summary for a file
 * @param {string} filename - Name of the file
 * @param {string} code - File contents
 * @returns {Promise<object>} AI-generated metadata
 */
async function generateFileSummary(filename, code) {
    // Check if we're rate limited
    if (isRateLimited()) {
        return null;
    }

    // Skip if too many consecutive errors
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        return null;
    }

    if (!model) {
        if (!(await initializeGemini())) {
            return null;
        }
    }

    const prompt = `You are a code analyzer. Analyze this file and return ONLY a JSON object (no markdown, no explanation):

File: ${filename}
Code:
\`\`\`
${code.substring(0, 3000)}
\`\`\`

Return JSON with these exact fields:
{
    "layer": "Frontend" | "Backend" | "Router" | "Database" | "Utility",
    "complexity": 1-100,
    "summary": "Write 2 sentences (25-35 words) describing what this file does and its purpose",
    "keywords": ["tag1", "tag2", "tag3"]
}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Clean up response - remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Reset error counter on success
        consecutiveErrors = 0;
        return JSON.parse(text);
    } catch (error) {
        consecutiveErrors++;

        // Check for rate limit error (429)
        if (error.message && error.message.includes('429')) {
            // Extract retry delay if available, default to 60s
            const retryMatch = error.message.match(/retry in ([\d.]+)s/i);
            const retryDelay = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
            setRateLimitCooldown(retryDelay);
        }

        // Only log first error to avoid spam
        if (consecutiveErrors === 1) {
            console.error('Gemini API error:', error.message || error);
        }
        return null;
    }
}

/**
 * Generate AI summary for a folder
 * @param {string} folderName - Name of the folder
 * @param {string[]} contents - List of files/subfolders
 * @returns {Promise<object>} AI-generated metadata
 */
async function generateFolderSummary(folderName, contents) {
    // Check if we're rate limited
    if (isRateLimited() || consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        return null;
    }

    if (!model) {
        if (!(await initializeGemini())) {
            return null;
        }
    }

    const prompt = `You are a code analyzer. Analyze this folder and return ONLY a JSON object:

Folder: ${folderName}
Contents: ${contents.join(', ')}

Return JSON with these exact fields:
{
    "purpose": "10 words max describing folder purpose",
    "type": "component" | "service" | "utility" | "config" | "asset" | "test"
}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        consecutiveErrors = 0;
        return JSON.parse(text);
    } catch (error) {
        consecutiveErrors++;
        if (error.message && error.message.includes('429')) {
            const retryMatch = error.message.match(/retry in ([\d.]+)s/i);
            setRateLimitCooldown(retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60);
        }
        return null;
    }
}

/**
 * Generate AI summary for entire project
 * @param {string} projectName - Name of the project
 * @param {object} fileStats - Statistics about file types
 * @param {object[]} folderStructure - Summary of folder structure
 * @returns {Promise<object>} AI-generated project metadata
 */
async function generateProjectSummary(projectName, fileStats, folderStructure) {
    // Check if we're rate limited
    if (isRateLimited() || consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        return null;
    }

    if (!model) {
        if (!(await initializeGemini())) {
            return null;
        }
    }

    const folderList = folderStructure.map(f => `${'  '.repeat(f.depth)}${f.name} (${f.childCount} items)`).join('\n');

    const prompt = `You are a code analyzer. Analyze this project and return ONLY a JSON object:

Project: ${projectName}
File Statistics:
- JavaScript/TypeScript: ${fileStats.code || 0}
- CSS/Styles: ${fileStats.style || 0}
- HTML/Markup: ${fileStats.markup || 0}
- Config/Data: ${fileStats.data || 0}
- Backend: ${fileStats.backend || 0}
- Documentation: ${fileStats.documentation || 0}

Folder Structure:
${folderList}

Return JSON with these exact fields:
{
    "description": "30 words max describing what this project does",
    "techStack": ["technology1", "technology2", "technology3"],
    "architecture": "Frontend" | "Backend" | "Full-stack" | "Library" | "CLI",
    "mainFeatures": ["feature1", "feature2", "feature3"]
}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        consecutiveErrors = 0;
        return JSON.parse(text);
    } catch (error) {
        consecutiveErrors++;
        if (error.message && error.message.includes('429')) {
            const retryMatch = error.message.match(/retry in ([\d.]+)s/i);
            setRateLimitCooldown(retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60);
        }
        return null;
    }
}

/**
 * Check if Gemini is configured
 */
async function isConfigured() {
    const apiKey = await getApiKey();
    return !!apiKey;
}

module.exports = {
    setSecretStorage,
    saveApiKey,
    getApiKey,
    initializeGemini,
    generateFileSummary,
    generateFolderSummary,
    generateProjectSummary,
    isConfigured
};
