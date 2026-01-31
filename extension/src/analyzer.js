const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const { generateFileSummary, generateFolderSummary, generateProjectSummary, isConfigured } = require('./gemini');

// Expanded to support all common file types
const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const styleExtensions = ['.css', '.scss', '.sass', '.less', '.styl'];
const markupExtensions = ['.html', '.htm', '.xml', '.svg'];
const dataExtensions = ['.json', '.yaml', '.yml', '.toml', '.env', '.ini', '.cfg'];
const backendExtensions = ['.py', '.rb', '.php', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.cs'];
const docExtensions = ['.md', '.mdx', '.txt', '.rst'];
const scriptExtensions = ['.sh', '.bash', '.ps1', '.bat', '.cmd'];

// All supported extensions for analysis
const allSupportedExtensions = [
    ...codeExtensions,
    ...styleExtensions,
    ...markupExtensions,
    ...dataExtensions,
    ...backendExtensions,
    ...docExtensions,
    ...scriptExtensions
];

const skipFolders = ['node_modules', 'dist', 'build', '.git', '.vscode', 'coverage', '__pycache__', '.next', '.nuxt', 'vendor', 'bower_components'];

/**
 * Analyze a single file and return metadata
 * @param {string} filePath 
 * @param {boolean} useAI - Whether to use Gemini AI for summaries
 * @returns {Promise<object>}
 */
async function analyzeFile(filePath, useAI = false) {
    const filename = path.basename(filePath);

    try {
        const code = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(filePath).toLowerCase();
        const fileCategory = getFileCategory(ext);

        // Get AI summary if enabled
        let aiData = null;
        if (useAI && (await isConfigured())) {
            aiData = await generateFileSummary(filename, code);
        }

        // Fallback to static analysis
        const layer = aiData?.layer || detectLayer(filePath, code, ext);
        const complexity = aiData?.complexity || calculateComplexity(code, ext);
        const summary = aiData?.summary || generateSummary(filename, layer, fileCategory);
        const keywords = aiData?.keywords || extractKeywords(code, ext);
        const dependencies = extractDependencies(code, ext);

        return {
            name: filename,
            path: filePath,
            type: 'file',
            fileCategory,
            extension: ext,
            attributes: {
                layer,
                complexity,
                summary,
                keywords: keywords.slice(0, 5),
                dependencies,
                fileType: fileCategory,
                aiGenerated: !!aiData
            }
        };

    } catch (error) {
        return {
            name: filename,
            path: filePath,
            type: 'unknown',
            attributes: {
                layer: 'Utility',
                complexity: 1,
                summary: 'Unreadable content',
                keywords: [],
                dependencies: [],
                aiGenerated: false
            }
        };
    }
}

/**
 * Analyze workspace and return hierarchical structure
 * @param {string} rootPath 
 * @param {function} progressCallback 
 * @returns {Promise<object>}
 */
async function analyzeWorkspace(rootPath, progressCallback) {
    const config = vscode.workspace.getConfiguration('codemap');
    const useAI = config.get('enableAI') && (await isConfigured());

    // Count total files first
    const allFiles = [];
    countFiles(rootPath, allFiles);
    const totalFiles = allFiles.length;
    let processed = 0;

    // Build hierarchical structure
    async function buildTree(dirPath) {
        const dirName = path.basename(dirPath);
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        const children = [];
        const childNames = entries.map(e => e.name);

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            // Skip unwanted folders
            if (entry.name.startsWith('.') || skipFolders.includes(entry.name)) {
                continue;
            }

            if (entry.isDirectory()) {
                const subTree = await buildTree(fullPath);
                if (subTree.children && subTree.children.length > 0) {
                    children.push(subTree);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                // Analyze all supported file types
                if (allSupportedExtensions.includes(ext)) {
                    processed++;
                    if (progressCallback) {
                        progressCallback(`Analyzing ${entry.name} (${processed}/${totalFiles})`);
                    }
                    const fileData = await analyzeFile(fullPath, useAI);
                    children.push(fileData);
                }
            }
        }

        // Get folder summary
        let folderSummary = null;
        if (useAI && children.length > 0) {
            folderSummary = await generateFolderSummary(dirName, childNames);
        }

        return {
            name: dirName,
            path: dirPath,
            type: 'folder',
            attributes: {
                purpose: folderSummary?.purpose || `Contains ${children.length} items`,
                folderType: folderSummary?.type || 'component',
                aiGenerated: !!folderSummary
            },
            children
        };
    }

    const tree = await buildTree(rootPath);

    // Also create flat list for visualization
    const flatList = flattenTree(tree);

    // Generate project summary
    let projectSummary = null;
    if (useAI) {
        const fileStats = getFileStats(flatList);
        const folderStructure = getFolderStructure(tree);
        projectSummary = await generateProjectSummary(path.basename(rootPath), fileStats, folderStructure);
    }

    return {
        tree,
        files: flatList,
        projectSummary: projectSummary || generateFallbackProjectSummary(flatList),
        stats: {
            totalFiles: flatList.length,
            aiAnalyzed: flatList.filter(f => f.attributes.aiGenerated).length
        }
    };
}

/**
 * Count all JS files
 */
function countFiles(dirPath, results) {
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.') || skipFolders.includes(entry.name)) continue;
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                countFiles(fullPath, results);
            } else if (allSupportedExtensions.includes(path.extname(entry.name).toLowerCase())) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        // Ignore errors
    }
}

/**
 * Flatten tree to list
 */
function flattenTree(node, results = []) {
    if (node.type === 'file') {
        results.push(node);
    }
    if (node.children) {
        for (const child of node.children) {
            flattenTree(child, results);
        }
    }
    return results;
}

/**
 * Get file category based on extension
 */
function getFileCategory(ext) {
    if (codeExtensions.includes(ext)) return 'code';
    if (styleExtensions.includes(ext)) return 'style';
    if (markupExtensions.includes(ext)) return 'markup';
    if (dataExtensions.includes(ext)) return 'data';
    if (backendExtensions.includes(ext)) return 'backend';
    if (docExtensions.includes(ext)) return 'documentation';
    if (scriptExtensions.includes(ext)) return 'script';
    return 'other';
}

/**
 * Calculate complexity from code
 */
function calculateComplexity(code, ext) {
    let complexity = 10;

    // Only use AST parsing for JS/TS files
    if (codeExtensions.includes(ext)) {
        try {
            const ast = parser.parse(code, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript']
            });

            traverse(ast, {
                FunctionDeclaration() { complexity += 5; },
                ArrowFunctionExpression() { complexity += 3; },
                ClassDeclaration() { complexity += 10; },
                IfStatement() { complexity += 2; },
                ForStatement() { complexity += 3; },
                WhileStatement() { complexity += 3; },
                SwitchStatement() { complexity += 4; },
                TryStatement() { complexity += 2; }
            });
        } catch (error) {
            // Parse error, return base complexity
        }
    } else {
        // Line-based complexity for non-JS files
        const lines = code.split('\n').length;
        complexity = Math.min(10 + Math.floor(lines / 20), 50);

        // CSS complexity boost for nested selectors
        if (styleExtensions.includes(ext)) {
            complexity += (code.match(/{/g) || []).length;
        }
    }
    return Math.min(complexity, 100);
}

/**
 * Extract dependencies from code
 */
function extractDependencies(code, ext) {
    const dependencies = [];

    // AST parsing for JS/TS
    if (codeExtensions.includes(ext)) {
        try {
            const ast = parser.parse(code, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript']
            });

            traverse(ast, {
                ImportDeclaration(nodePath) {
                    const source = nodePath.node.source.value;
                    if (source.startsWith('./') || source.startsWith('../')) {
                        const depName = path.basename(source).replace(/\.(js|jsx|ts|tsx)$/, '');
                        dependencies.push(depName);
                    }
                }
            });
        } catch (error) {
            // Ignore parse errors
        }
    } else if (styleExtensions.includes(ext)) {
        // CSS @import
        const importRegex = /@import\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(code)) !== null) {
            dependencies.push(path.basename(match[1]));
        }
    } else if (markupExtensions.includes(ext)) {
        // HTML script/link references
        const srcRegex = /(?:src|href)=['"]([^'"]+)['"]/g;
        let match;
        while ((match = srcRegex.exec(code)) !== null) {
            const ref = match[1];
            if (!ref.startsWith('http') && !ref.startsWith('//')) {
                dependencies.push(path.basename(ref));
            }
        }
    } else if (backendExtensions.includes(ext)) {
        // Python imports
        if (ext === '.py') {
            const importRegex = /(?:from|import)\s+([\w.]+)/g;
            let match;
            while ((match = importRegex.exec(code)) !== null) {
                const modName = match[1].split('.')[0];
                if (!dependencies.includes(modName)) {
                    dependencies.push(modName);
                }
            }
        }
    }

    return dependencies;
}

/**
 * Extract keywords from code
 */
function extractKeywords(code, ext) {
    const keywords = new Set();

    // AST parsing for JS/TS
    if (codeExtensions.includes(ext)) {
        try {
            const ast = parser.parse(code, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript']
            });

            traverse(ast, {
                ClassDeclaration(nodePath) {
                    if (nodePath.node.id) keywords.add(nodePath.node.id.name);
                },
                CallExpression(nodePath) {
                    const name = nodePath.node.callee.name;
                    if (['useState', 'useEffect', 'useContext'].includes(name)) {
                        keywords.add('React Hook');
                    }
                },
                JSXElement() { keywords.add('JSX'); }
            });
        } catch (error) {
            // Ignore
        }
    } else if (styleExtensions.includes(ext)) {
        // CSS keywords
        if (code.includes('@media')) keywords.add('Responsive');
        if (code.includes('@keyframes')) keywords.add('Animation');
        if (code.includes(':root') || code.includes('var(--')) keywords.add('CSS Variables');
        if (code.includes('flex')) keywords.add('Flexbox');
        if (code.includes('grid')) keywords.add('Grid');
    } else if (markupExtensions.includes(ext)) {
        // HTML keywords
        if (code.includes('<form')) keywords.add('Form');
        if (code.includes('<table')) keywords.add('Table');
        if (code.includes('<canvas')) keywords.add('Canvas');
        if (code.includes('<svg')) keywords.add('SVG');
        if (code.includes('data-')) keywords.add('Data Attributes');
    } else if (dataExtensions.includes(ext)) {
        // Config file keywords
        keywords.add('Configuration');
        if (ext === '.json' && code.includes('"scripts"')) keywords.add('NPM Scripts');
        if (ext === '.json' && code.includes('"dependencies"')) keywords.add('Dependencies');
    } else if (docExtensions.includes(ext)) {
        keywords.add('Documentation');
        if (code.includes('## ') || code.includes('# ')) keywords.add('Markdown');
    }

    return Array.from(keywords);
}

/**
 * Detect architectural layer
 */
function detectLayer(filePath, code, ext) {
    const lowerPath = filePath.toLowerCase();
    const lowerCode = code.toLowerCase();

    // Style files are always Frontend
    if (styleExtensions.includes(ext)) {
        return 'Frontend';
    }

    // Documentation is always Utility
    if (docExtensions.includes(ext)) {
        return 'Utility';
    }

    // Config/data files
    if (dataExtensions.includes(ext)) {
        if (lowerPath.includes('package.json') || lowerPath.includes('tsconfig')) {
            return 'Utility';
        }
        return 'Configuration';
    }

    if (lowerPath.includes('component') || lowerPath.includes('page') ||
        lowerCode.includes('react') || lowerCode.includes('jsx')) {
        return 'Frontend';
    }
    if (lowerPath.includes('route') || lowerPath.includes('controller') ||
        lowerCode.includes('express') || lowerCode.includes('router')) {
        return 'Router';
    }
    if (lowerPath.includes('model') || lowerPath.includes('schema') ||
        lowerCode.includes('mongoose') || lowerCode.includes('sequelize')) {
        return 'Database';
    }
    if (lowerPath.includes('service') || lowerPath.includes('middleware')) {
        return 'Backend';
    }
    return 'Utility';
}

/**
 * Generate fallback summary
 */
function generateSummary(filename, layer, fileCategory) {
    const name = filename.replace(/\.[^.]+$/, '');

    // Category-specific summaries
    if (fileCategory === 'style') {
        return `Styles for ${name} components`;
    }
    if (fileCategory === 'markup') {
        return `HTML structure for ${name}`;
    }
    if (fileCategory === 'data') {
        return `Configuration for ${name}`;
    }
    if (fileCategory === 'documentation') {
        return `Documentation for ${name}`;
    }
    if (fileCategory === 'script') {
        return `Script for ${name} automation`;
    }

    const summaries = {
        'Frontend': `Renders the ${name} UI component`,
        'Router': `Handles ${name} API routes`,
        'Database': `Defines ${name} data model`,
        'Backend': `Implements ${name} business logic`,
        'Configuration': `Configuration for ${name}`,
        'Utility': `Provides ${name} utilities`
    };
    return summaries[layer] || `${name} module`;
}

/**
 * Get file statistics by category
 */
function getFileStats(files) {
    const stats = {
        code: 0,
        style: 0,
        markup: 0,
        data: 0,
        backend: 0,
        documentation: 0,
        script: 0,
        other: 0
    };

    for (const file of files) {
        const category = file.fileCategory || 'other';
        stats[category] = (stats[category] || 0) + 1;
    }

    return stats;
}

/**
 * Get folder structure summary
 */
function getFolderStructure(tree, depth = 0, result = []) {
    if (depth > 2) return result; // Limit depth for summary

    if (tree.type === 'folder' && tree.children) {
        result.push({
            name: tree.name,
            depth,
            childCount: tree.children.length
        });
        for (const child of tree.children) {
            getFolderStructure(child, depth + 1, result);
        }
    }
    return result;
}

/**
 * Generate fallback project summary
 */
function generateFallbackProjectSummary(files) {
    const stats = getFileStats(files);

    let techStack = [];
    if (stats.code > 0) techStack.push('JavaScript/TypeScript');
    if (stats.style > 0) techStack.push('CSS');
    if (stats.markup > 0) techStack.push('HTML');
    if (stats.backend > 0) techStack.push('Backend');

    return {
        description: `Project with ${files.length} analyzable files`,
        techStack,
        stats,
        architecture: stats.code > stats.backend ? 'Frontend-focused' : 'Full-stack'
    };
}

module.exports = { analyzeFile, analyzeWorkspace };
