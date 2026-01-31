/**
 * Generate webview HTML with D3.js visualization - Matching React App Design
 * @param {object} data - The knowledge map data (tree + files)
 * @param {object} webview - VS Code webview object
 * @returns {string} HTML content
 */
function getWebviewContent(data, webview) {
    const filesJson = JSON.stringify(data.files || []);
    const treeJson = JSON.stringify(data.tree || null);
    const projectSummaryJson = JSON.stringify(data.projectSummary || null);
    const statsJson = JSON.stringify(data.stats || { totalFiles: 0, aiAnalyzed: 0 });
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src data:;">
    <title>CodeMap Neural Engine</title>
    <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            overflow: hidden;
        }
        
        .app {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        /* Header */
        .header {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 20px;
            background: rgba(0, 0, 0, 0.4);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .logo-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .logo-icon {
            font-size: 24px;
            font-weight: 700;
            color: #0066ff;
            font-family: 'Consolas', 'Monaco', monospace;
            background: linear-gradient(135deg, #0066ff 0%, #00d9ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header h1 {
            background: linear-gradient(90deg, #00d9ff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 18px;
            font-weight: 700;
            white-space: nowrap;
        }
        
        .header-controls {
            display: flex;
            align-items: center;
            gap: 16px;
            flex: 1;
        }
        
        .stats-badges {
            display: flex;
            gap: 10px;
        }
        
        .stat-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .stat-badge.files {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
        }
        
        .stat-badge.ai {
            background: rgba(80, 80, 80, 0.2);
            border: 1px solid rgba(100, 100, 100, 0.3);
            color: rgba(150, 150, 150, 0.7);
        }
        
        .stat-badge.ai.active {
            background: linear-gradient(135deg, rgba(157, 78, 221, 0.3), rgba(0, 217, 255, 0.3));
            border: 1px solid rgba(0, 217, 255, 0.5);
            color: #00d9ff;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 5px rgba(0, 217, 255, 0.3); }
            50% { box-shadow: 0 0 15px rgba(0, 217, 255, 0.6); }
        }
        
        .badge-icon {
            font-size: 10px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            padding: 2px 6px;
            border-radius: 4px;
        }
        
        .tab-buttons {
            display: flex;
            gap: 6px;
        }
        
        .tab-buttons button {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        
        .tab-buttons button:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }
        
        .tab-buttons button.active {
            background: linear-gradient(135deg, rgba(0, 217, 255, 0.4), rgba(0, 255, 136, 0.3));
            color: #fff;
            border-color: rgba(0, 217, 255, 0.5);
        }
        
        .color-toggle {
            display: none;
            align-items: center;
            gap: 8px;
            margin-left: auto;
        }
        
        .color-toggle.visible { display: flex; }
        
        .color-toggle span {
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
        }
        
        .color-toggle button {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.7);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .color-toggle button:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        
        .color-toggle button.active {
            background: rgba(0, 217, 255, 0.25);
            color: #00d9ff;
            border-color: rgba(0, 217, 255, 0.5);
        }
        
        /* Main Content */
        .main {
            flex: 1;
            display: flex;
            position: relative;
            min-height: 0;
            overflow: hidden;
        }
        
        .viz-container {
            flex: 1;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 16px;
            margin: 16px;
            overflow: hidden;
            position: relative;
            display: none;
        }
        
        .viz-container.active { display: flex; flex-direction: column; }
        
        svg { width: 100%; height: 100%; display: block; }
        
        /* Map Header */
        .map-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: rgba(0,0,0,0.25);
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .map-title {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
        }
        
        .map-legend {
            display: flex;
            gap: 14px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 10px;
            font-weight: 500;
        }
        
        .legend-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        
        .map-content {
            flex: 1;
            position: relative;
            min-height: 400px;
            height: 100%;
        }
        
        .map-content svg {
            width: 100%;
            height: 100%;
            min-height: 400px;
        }
        
        /* File Summary Panel */
        .file-summary-panel {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 280px;
            max-height: calc(100% - 32px);
            background: rgba(15, 15, 25, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 100;
            display: none;
        }
        
        .file-summary-panel.visible { display: block; }
        
        .close-panel {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 24px;
            height: 24px;
            border: none;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            z-index: 10;
        }
        
        .close-panel:hover {
            background: rgba(255, 107, 107, 0.3);
        }
        
        .summary-header {
            padding: 16px;
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .summary-header .file-ext {
            font-size: 11px;
            font-weight: 700;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
            letter-spacing: 1px;
        }
        
        .summary-header h3 {
            margin: 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            word-break: break-word;
        }
        
        .layer-tag {
            display: inline-block;
            font-size: 9px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 10px;
            text-transform: uppercase;
        }
        
        .summary-content {
            padding: 12px 16px;
            overflow-y: auto;
            max-height: 400px;
        }
        
        .summary-section {
            margin-bottom: 14px;
        }
        
        .summary-section h4 {
            margin: 0 0 6px 0;
            font-size: 10px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
        }
        
        .summary-section p {
            margin: 0;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.5;
        }
        
        .keyword-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        
        .keyword-tag {
            font-size: 10px;
            padding: 3px 8px;
            background: rgba(0, 217, 255, 0.15);
            color: #00d9ff;
            border-radius: 10px;
            border: 1px solid rgba(0, 217, 255, 0.2);
        }
        
        .complexity-bar {
            display: flex;
            align-items: center;
            gap: 10px;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: visible;
            position: relative;
        }
        
        .complexity-fill {
            height: 100%;
            border-radius: 4px;
        }
        
        .complexity-bar span {
            position: absolute;
            right: -30px;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 600;
        }
        
        .dep-list-section {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        
        .dep-list-item {
            font-size: 11px;
            padding: 4px 8px;
            margin-bottom: 4px;
            border-radius: 6px;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
        }
        
        .dep-list-item.imports {
            background: rgba(0, 217, 255, 0.1);
            color: #00d9ff;
        }
        
        .dep-list-item.dependents {
            background: rgba(107, 203, 119, 0.1);
            color: #6bcb77;
        }
        
        .no-deps {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
            font-style: italic;
        }
        
        /* Legend */
        .legend {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(15, 15, 30, 0.95);
            padding: 14px 18px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .legend-title {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .legend-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 8px 0;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.85);
        }
        
        .legend-dot-lg {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        /* Structure Container */
        .structure-container {
            flex: 1;
            margin: 16px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            overflow: hidden;
            display: none;
            flex-direction: column;
        }
        
        .structure-container.active { display: flex; }
        
        /* Project Summary */
        .project-summary {
            padding: 20px;
            background: linear-gradient(135deg, rgba(0, 217, 255, 0.08), rgba(157, 78, 221, 0.08));
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .project-summary h3 {
            color: #fff;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .project-description {
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 12px;
        }
        
        .tech-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .tech-badge {
            background: rgba(0, 217, 255, 0.15);
            color: #00d9ff;
            padding: 4px 12px;
            border-radius: 14px;
            font-size: 10px;
            font-weight: 500;
            border: 1px solid rgba(0, 217, 255, 0.2);
        }
        
        /* View Controls */
        .view-controls {
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.25);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            flex-wrap: wrap;
        }
        
        .view-controls button {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        
        .view-controls button:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
        }
        
        .view-controls button.active {
            background: rgba(0, 217, 255, 0.2);
            color: #00d9ff;
            border-color: rgba(0, 217, 255, 0.4);
        }
        
        /* Tree Content */
        .tree-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            min-height: 0;
        }
        
        .tree-content::-webkit-scrollbar { width: 8px; }
        .tree-content::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); }
        .tree-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
        
        /* Hierarchy Items */
        .hierarchy-legend {
            display: flex;
            gap: 20px;
            padding: 10px 14px;
            background: rgba(0, 0, 0, 0.25);
            border-radius: 10px;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 16px;
        }
        
        .hierarchy-legend span {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .hierarchy-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 4px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 12px;
        }
        
        .hierarchy-item:hover { background: rgba(255, 255, 255, 0.08); }
        
        .expand-icon {
            font-size: 10px;
            width: 14px;
            color: rgba(255, 255, 255, 0.5);
        }
        
        .file-ext-badge {
            font-size: 9px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
            text-transform: uppercase;
            min-width: 36px;
            text-align: center;
        }
        
        .file-ext-badge.jsx { background: rgba(97, 218, 251, 0.2); color: #61dafb; }
        .file-ext-badge.js { background: rgba(247, 223, 30, 0.2); color: #f7df1e; }
        .file-ext-badge.ts { background: rgba(49, 120, 198, 0.2); color: #3178c6; }
        .file-ext-badge.tsx { background: rgba(97, 218, 251, 0.2); color: #61dafb; }
        .file-ext-badge.css { background: rgba(38, 77, 228, 0.2); color: #42a5f5; }
        .file-ext-badge.html { background: rgba(227, 79, 38, 0.2); color: #e34f26; }
        .file-ext-badge.json { background: rgba(255, 159, 67, 0.2); color: #ff9f43; }
        .file-ext-badge.md { background: rgba(157, 78, 221, 0.2); color: #9d4edd; }
        
        .node-name { flex: 1; font-weight: 500; }
        
        .layer-badge {
            font-size: 9px;
            padding: 4px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .layer-badge.frontend { background: rgba(0, 217, 255, 0.2); color: #00d9ff; }
        .layer-badge.router { background: rgba(255, 107, 107, 0.2); color: #ff6b6b; }
        .layer-badge.backend { background: rgba(107, 203, 119, 0.2); color: #6bcb77; }
        .layer-badge.database { background: rgba(255, 217, 61, 0.2); color: #ffd93d; }
        .layer-badge.configuration { background: rgba(255, 159, 67, 0.2); color: #ff9f43; }
        .layer-badge.utility { background: rgba(157, 78, 221, 0.2); color: #9d4edd; }
        
        .dep-info { display: flex; gap: 6px; }
        
        .imports-count {
            color: #00d9ff;
            font-size: 10px;
            font-weight: 600;
            background: rgba(0, 217, 255, 0.12);
            padding: 3px 8px;
            border-radius: 6px;
        }
        
        .dependents-count {
            color: #6bcb77;
            font-size: 10px;
            font-weight: 600;
            background: rgba(107, 203, 119, 0.12);
            padding: 3px 8px;
            border-radius: 6px;
        }
        
        .hierarchy-children {
            margin-left: 20px;
            padding-left: 12px;
            border-left: 1px dashed rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body>
    <div class="app">
        <header class="header">
            <div class="logo-title">
                <span class="logo-icon">&lt;/&gt;</span>
                <h1>CodeMap Neural Engine</h1>
            </div>
            <div class="header-controls">
                <div class="stats-badges">
                    <span class="stat-badge files">
                        <span class="badge-icon">F</span>
                        <span>Files: <span id="totalFiles">0</span></span>
                    </span>
                    <span class="stat-badge ai" id="aiBadge">
                        <span class="badge-icon">AI</span>
                        <span>AI Analyzed: <span id="aiFiles">0</span></span>
                    </span>
                </div>
                <div class="tab-buttons">
                    <button id="btnMap" class="active">Map</button>
                    <button id="btnStructure">Structure</button>
                </div>
            </div>
        </header>
        
        <main class="main">
            <!-- Map View (Fixed Position) -->
            <div class="viz-container active" id="mapView">
                <div class="map-header">
                    <span class="map-title">Architecture Map</span>
                    <div class="map-legend" id="mapLegend"></div>
                </div>
                <div class="map-content">
                    <svg id="mapVisualization"></svg>
                    <div class="file-summary-panel" id="fileSummaryPanel">
                        <button class="close-panel" id="closePanelBtn">×</button>
                        <div class="summary-header" id="summaryHeader"></div>
                        <div class="summary-content" id="summaryContent"></div>
                    </div>
                </div>
            </div>
            
            <div class="structure-container" id="structureView">
                <div class="project-summary" id="projectSummary"></div>
                <div class="view-controls" id="viewControls">
                    <button id="btnHierarchy" class="active">Hierarchy</button>
                    <button id="btnLayers">Layers</button>
                    <button id="btnTypes">Types</button>
                    <button id="btnExpand">+ Expand</button>
                    <button id="btnCollapse">- Collapse</button>
                </div>
                <div class="tree-content" id="treeContent"></div>
            </div>
        </main>
    </div>
    
    <script nonce="${nonce}">
        const files = ${filesJson};
        const tree = ${treeJson};
        const projectSummary = ${projectSummaryJson};
        const stats = ${statsJson};
        
        const layerColors = {
            'Frontend': '#00d9ff',
            'Router': '#ff6b6b',
            'Backend': '#6bcb77',
            'Database': '#ffd93d',
            'Configuration': '#ff9f43',
            'Utility': '#9d4edd'
        };
        
        const layerOrder = ['Frontend', 'Router', 'Backend', 'Database', 'Configuration', 'Utility'];
        
        const fileTypeColors = {
            'code': '#00d9ff',
            'style': '#ff6b9d',
            'markup': '#ffa502',
            'data': '#ff9f43',
            'backend': '#6bcb77',
            'documentation': '#a29bfe',
            'other': '#888'
        };
        
        let currentStructureView = 'hierarchy';
        let expandedNodes = new Set();
        let colorMode = 'layer';
        let selectedNode = null;
        let currentTab = 'map';
        
        // Flatten tree
        function flattenTree(node, result = []) {
            if (node.type === 'file') result.push(node);
            if (node.children) node.children.forEach(child => flattenTree(child, result));
            return result;
        }
        
        // Count AI analyzed
        function countAIAnalyzed(node) {
            let count = 0;
            if (node.type === 'file' && node.attributes?.aiGenerated) count++;
            if (node.children) node.children.forEach(child => count += countAIAnalyzed(child));
            return count;
        }
        
        const allFiles = tree ? flattenTree(tree) : files;
        const totalFiles = allFiles.length || stats.totalFiles;
        const aiAnalyzed = tree ? countAIAnalyzed(tree) : stats.aiAnalyzed || 0;
        
        document.getElementById('totalFiles').textContent = totalFiles;
        document.getElementById('aiFiles').textContent = aiAnalyzed;
        if (aiAnalyzed > 0) document.getElementById('aiBadge').classList.add('active');
        
        // Build file data
        function buildFileData() {
            const fileMap = new Map();
            allFiles.forEach(f => {
                const baseName = f.name.replace(/\.[^.]+$/, '');
                const data = {
                    ...f,
                    baseName,
                    dependencies: f.attributes?.dependencies || [],
                    dependents: [],
                    layer: f.attributes?.layer || 'Utility',
                    summary: f.attributes?.summary || 'No summary available',
                    keywords: f.attributes?.keywords || [],
                    complexity: f.attributes?.complexity || 10
                };
                fileMap.set(baseName, data);
                fileMap.set(f.name, data);
            });
            
            allFiles.forEach(f => {
                const deps = f.attributes?.dependencies || [];
                deps.forEach(dep => {
                    const depClean = dep.replace(/\.[^.]+$/, '');
                    const target = fileMap.get(depClean);
                    if (target) {
                        const source = fileMap.get(f.name);
                        if (source && !target.dependents.includes(source.baseName)) {
                            target.dependents.push(source.baseName);
                        }
                    }
                });
            });
            return { fileMap };
        }
        
        // Tab switching
        function switchTab(tab) {
            currentTab = tab;
            document.getElementById('btnMap').classList.toggle('active', tab === 'map');
            document.getElementById('btnStructure').classList.toggle('active', tab === 'structure');
            document.getElementById('mapView').classList.toggle('active', tab === 'map');
            document.getElementById('structureView').classList.toggle('active', tab === 'structure');
            
            if (tab === 'map') renderMap();
            if (tab === 'structure') {
                renderProjectSummary();
                renderStructure();
            }
        }
        
        // Color mode (kept for future use)
        function setColorMode(mode) {
            colorMode = mode;
        }
        
        // Render map legend
        function renderMapLegend() {
            const legend = document.getElementById('mapLegend');
            legend.innerHTML = layerOrder.map(layer => 
                '<span class="legend-item" style="color:' + layerColors[layer] + '">' +
                '<span class="legend-dot" style="background:' + layerColors[layer] + '"></span>' +
                layer + '</span>'
            ).join('');
        }
        
        // Render graph legend
        function renderLegend() {
            const legend = document.getElementById('legend');
            if (colorMode === 'fileType') {
                legend.innerHTML = '<div class="legend-title">FILE TYPES</div>' +
                    Object.entries({ Code: '#00d9ff', Styles: '#ff6b9d', Markup: '#ffa502', Config: '#ff9f43', Docs: '#a29bfe' })
                        .map(([k, c]) => '<div class="legend-row"><div class="legend-dot-lg" style="background:' + c + '"></div>' + k + '</div>').join('');
            } else {
                legend.innerHTML = '<div class="legend-title">LAYERS</div>' +
                    Object.entries(layerColors)
                        .map(([k, c]) => '<div class="legend-row"><div class="legend-dot-lg" style="background:' + c + '"></div>' + k + '</div>').join('');
            }
        }
        
        // Show file summary panel
        function showSummaryPanel(node) {
            selectedNode = node;
            const panel = document.getElementById('fileSummaryPanel');
            const header = document.getElementById('summaryHeader');
            const content = document.getElementById('summaryContent');
            const color = layerColors[node.layer] || '#888';
            
            header.innerHTML = 
                '<span class="file-ext" style="color:' + color + '">' + ((node.extension || '').replace('.', '').toUpperCase() || 'FILE') + '</span>' +
                '<h3>' + (node.baseName || node.name) + '</h3>' +
                '<span class="layer-tag" style="background:' + color + '20;color:' + color + ';border:1px solid ' + color + '40">' + node.layer + '</span>';
            
            const deps = node.dependencies || [];
            const usedBy = node.dependents || [];
            const complexity = node.complexity || 10;
            const complexityColor = complexity > 50 ? '#ff6b6b' : complexity > 25 ? '#ffd93d' : '#6bcb77';
            
            content.innerHTML = 
                '<div class="summary-section"><h4>Summary</h4><p>' + (node.summary || 'No summary available') + '</p></div>' +
                (node.keywords && node.keywords.length > 0 ? 
                    '<div class="summary-section"><h4>Keywords</h4><div class="keyword-tags">' + 
                    node.keywords.map(k => '<span class="keyword-tag">' + k + '</span>').join('') + '</div></div>' : '') +
                '<div class="summary-section"><h4>Complexity</h4><div class="complexity-bar"><div class="complexity-fill" style="width:' + Math.min(complexity, 100) + '%;background:' + complexityColor + '"></div><span>' + complexity + '</span></div></div>' +
                '<div class="summary-section"><h4>Dependencies</h4>' + 
                (deps.length > 0 ? '<ul class="dep-list-section">' + deps.map(d => '<li class="dep-list-item imports">↓ ' + d + '</li>').join('') + '</ul>' : '<p class="no-deps">No dependencies</p>') + '</div>' +
                '<div class="summary-section"><h4>Used By</h4>' + 
                (usedBy.length > 0 ? '<ul class="dep-list-section">' + usedBy.map(d => '<li class="dep-list-item dependents">↑ ' + d + '</li>').join('') + '</ul>' : '<p class="no-deps">Not imported by other files</p>') + '</div>';
            
            panel.classList.add('visible');
        }
        
        function hideSummaryPanel() {
            selectedNode = null;
            document.getElementById('fileSummaryPanel').classList.remove('visible');
        }
        
        // Render fixed-position map
        function renderMap() {
            console.log('renderMap called, allFiles:', allFiles.length);
            const svg = d3.select('#mapVisualization');
            svg.selectAll('*').remove();
            
            const container = svg.node().parentElement;
            const width = container.clientWidth || 800;
            const height = Math.max(container.clientHeight || 500, 500);
            
            console.log('SVG dimensions:', width, height);
            
            // Set SVG dimensions explicitly
            svg.attr('width', width).attr('height', height);
            
            const { fileMap } = buildFileData();
            console.log('fileMap size:', fileMap.size);
            
            // Larger values to match React webview
            const layerHeight = 120;
            const nodeRadius = 32;
            const verticalPadding = 50;
            const horizontalPadding = 80;
            
            // Group files by layer
            const layerGroups = {};
            allFiles.forEach(f => {
                const layer = f.attributes?.layer || 'Utility';
                if (!layerGroups[layer]) layerGroups[layer] = [];
                layerGroups[layer].push(f);
            });
            
            // Calculate positions - centered with max spacing like React version
            const positions = new Map();
            let currentY = verticalPadding;
            
            layerOrder.forEach(layerName => {
                const nodes = layerGroups[layerName] || [];
                if (nodes.length === 0) return;
                
                const layerY = currentY + layerHeight / 2;
                const availableWidth = width - horizontalPadding * 2;
                // Max spacing of 140px like React version
                const nodeSpacing = nodes.length > 1 
                    ? Math.min(availableWidth / nodes.length, 140) 
                    : 0;
                const totalWidth = nodeSpacing * (nodes.length - 1);
                const startX = (width - totalWidth) / 2;
                
                nodes.forEach((node, i) => {
                    const data = fileMap.get(node.name);
                    positions.set(node.name, {
                        x: startX + i * nodeSpacing,
                        y: layerY,
                        layer: layerName,
                        data: data
                    });
                });
                
                currentY += layerHeight;
            });
            
            // Defs - improved arrow markers
            const defs = svg.append('defs');
            
            // Glow filter for links
            const glowFilter = defs.append('filter')
                .attr('id', 'link-glow')
                .attr('x', '-50%')
                .attr('y', '-50%')
                .attr('width', '200%')
                .attr('height', '200%');
            glowFilter.append('feGaussianBlur')
                .attr('stdDeviation', '2')
                .attr('result', 'coloredBlur');
            const glowMerge = glowFilter.append('feMerge');
            glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
            glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');
            
            layerOrder.forEach(layer => {
                defs.append('marker')
                    .attr('id', 'arrow-' + layer.toLowerCase())
                    .attr('viewBox', '0 -6 12 12')
                    .attr('refX', 28)
                    .attr('refY', 0)
                    .attr('orient', 'auto')
                    .attr('markerWidth', 10)
                    .attr('markerHeight', 10)
                    .append('path')
                    .attr('d', 'M0,-5L12,0L0,5Z')
                    .attr('fill', layerColors[layer]);
            });
            
            // Layer backgrounds
            const layerBg = svg.append('g');
            let bgY = verticalPadding - 15;
            
            layerOrder.forEach(layerName => {
                const nodes = layerGroups[layerName] || [];
                if (nodes.length === 0) return;
                
                layerBg.append('rect')
                    .attr('x', 25)
                    .attr('y', bgY)
                    .attr('width', width - 50)
                    .attr('height', layerHeight - 10)
                    .attr('rx', 12)
                    .attr('fill', layerColors[layerName])
                    .attr('opacity', 0.08);
                
                layerBg.append('text')
                    .attr('x', 35)
                    .attr('y', bgY + 18)
                    .attr('fill', layerColors[layerName])
                    .attr('font-size', '10px')
                    .attr('font-weight', '600')
                    .text(layerName.toUpperCase());
                
                bgY += layerHeight;
            });
            
            // Build links array first (like React version - deduplicated)
            const links = [];
            allFiles.forEach(file => {
                const deps = file.attributes?.dependencies || [];
                const sourceData = fileMap.get(file.name.replace(/\.[^.]+$/, ''));
                deps.forEach(dep => {
                    const depClean = dep.replace(/\.[^.]+$/, '');
                    const targetData = fileMap.get(depClean);
                    if (targetData && sourceData && sourceData.name !== targetData.name) {
                        const exists = links.some(l => 
                            l.source === file.name && l.target === targetData.name
                        );
                        if (!exists) {
                            links.push({
                                source: file.name,
                                target: targetData.name,
                                sourceLayer: sourceData.layer,
                                targetLayer: targetData.layer
                            });
                        }
                    }
                });
            });
            
            // Draw links (exactly like React version)
            const linkGroup = svg.append('g').attr('class', 'links');
            
            links.forEach(link => {
                const sourcePos = positions.get(link.source);
                const targetPos = positions.get(link.target);
                
                if (!sourcePos || !targetPos) return;
                
                const sourceColor = layerColors[sourcePos.layer] || '#888';
                const markerName = 'arrow-' + (sourcePos.layer || 'utility').toLowerCase();
                
                // Calculate curve (exactly like React version)
                const dx = targetPos.x - sourcePos.x;
                const dy = targetPos.y - sourcePos.y;
                
                let pathD;
                if (Math.abs(dx) < 20) {
                    // Vertical line with slight curve
                    const midY = (sourcePos.y + targetPos.y) / 2;
                    pathD = 'M' + sourcePos.x + ',' + (sourcePos.y + nodeRadius) + 
                            ' Q' + (sourcePos.x + 30) + ',' + midY + 
                            ' ' + targetPos.x + ',' + (targetPos.y - nodeRadius);
                } else {
                    // Curved path
                    const midX = (sourcePos.x + targetPos.x) / 2;
                    const midY = (sourcePos.y + targetPos.y) / 2;
                    const curveOffset = dy > 0 ? Math.min(Math.abs(dx) * 0.3, 40) : 0;
                    pathD = 'M' + sourcePos.x + ',' + (sourcePos.y + nodeRadius) + 
                            ' Q' + midX + ',' + (midY + curveOffset) + 
                            ' ' + targetPos.x + ',' + (targetPos.y - nodeRadius);
                }
                
                // Glow line first
                linkGroup.append('path')
                    .attr('d', pathD)
                    .attr('fill', 'none')
                    .attr('stroke', sourceColor)
                    .attr('stroke-width', 6)
                    .attr('opacity', 0.15)
                    .attr('filter', 'url(#link-glow)');
                
                // Main visible link
                linkGroup.append('path')
                    .attr('d', pathD)
                    .attr('fill', 'none')
                    .attr('stroke', sourceColor)
                    .attr('stroke-width', 3)
                    .attr('opacity', 0.8)
                    .attr('stroke-linecap', 'round')
                    .attr('marker-end', 'url(#' + markerName + ')')
                    .attr('class', 'link-path');
            });
            
            // Nodes
            const nodeGroup = svg.append('g');
            
            positions.forEach((pos, nodeId) => {
                const data = pos.data;
                if (!data) return;
                
                const color = layerColors[pos.layer];
                const g = nodeGroup.append('g')
                    .attr('transform', 'translate(' + pos.x + ',' + pos.y + ')')
                    .style('cursor', 'pointer');
                
                g.append('circle')
                    .attr('r', nodeRadius)
                    .attr('fill', 'rgba(10,10,20,0.95)')
                    .attr('stroke', color)
                    .attr('stroke-width', 3);
                
                const ext = (data.extension || '').replace('.', '').toUpperCase() || 'FILE';
                g.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.35em')
                    .attr('fill', color)
                    .attr('font-size', '12px')
                    .attr('font-weight', '700')
                    .attr('font-family', 'Monaco, Consolas, monospace')
                    .text(ext.slice(0, 4));
                
                g.append('text')
                    .attr('y', nodeRadius + 14)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#fff')
                    .attr('font-size', '10px')
                    .attr('font-weight', '500')
                    .text(data.baseName.length > 12 ? data.baseName.slice(0, 10) + '..' : data.baseName);
                
                g.on('mouseenter', function() {
                    d3.select(this).select('circle').attr('stroke-width', 5);
                });
                
                g.on('mouseleave', function() {
                    d3.select(this).select('circle').attr('stroke-width', 3);
                });
                
                g.on('click', () => showSummaryPanel(data));
            });
        }
        
        // Render force graph
        function renderGraph() {
            const svg = d3.select('#graphVisualization');
            svg.selectAll('*').remove();
            
            const width = svg.node().clientWidth;
            const height = svg.node().clientHeight;
            const padding = 80;
            
            const { fileMap } = buildFileData();
            
            const layerPositions = {
                'Frontend': { x: 0.25, y: 0.3 },
                'Router': { x: 0.5, y: 0.5 },
                'Backend': { x: 0.75, y: 0.3 },
                'Database': { x: 0.75, y: 0.7 },
                'Configuration': { x: 0.5, y: 0.85 },
                'Utility': { x: 0.25, y: 0.85 }
            };
            
            // Defs
            const defs = svg.append('defs');
            const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
            filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
            const merge = filter.append('feMerge');
            merge.append('feMergeNode').attr('in', 'coloredBlur');
            merge.append('feMergeNode').attr('in', 'SourceGraphic');
            
            defs.append('marker').attr('id', 'arrowhead').attr('viewBox', '-0 -5 10 10').attr('refX', 20).attr('refY', 0)
                .attr('orient', 'auto').attr('markerWidth', 6).attr('markerHeight', 6)
                .append('path').attr('d', 'M 0,-5 L 10,0 L 0,5').attr('fill', 'rgba(255,255,255,0.4)');
            
            // Build nodes
            const nodes = allFiles.map(d => {
                const layer = d.attributes?.layer || 'Utility';
                const pos = layerPositions[layer] || { x: 0.5, y: 0.5 };
                const data = fileMap.get(d.name);
                return {
                    id: d.name,
                    baseName: d.name.replace(/\\.[^.]+$/, ''),
                    fileCategory: d.fileCategory || d.attributes?.fileType || 'code',
                    layer: layer,
                    complexity: d.attributes?.complexity || 10,
                    summary: d.attributes?.summary,
                    keywords: d.attributes?.keywords,
                    dependencies: data?.dependencies || [],
                    dependents: data?.dependents || [],
                    x: pos.x * (width - padding * 2) + padding + (Math.random() - 0.5) * 100,
                    y: pos.y * (height - padding * 2) + padding + (Math.random() - 0.5) * 100
                };
            });
            
            const nodeMap = new Map(nodes.map(n => [n.baseName, n]));
            nodes.forEach(n => nodeMap.set(n.id, n));
            
            // Build links
            const links = [];
            allFiles.forEach(f => {
                const deps = f.attributes?.dependencies || [];
                const src = nodeMap.get(f.name);
                deps.forEach(dep => {
                    const tgt = nodeMap.get(dep.replace(/\\.[^.]+$/, ''));
                    if (src && tgt && src.id !== tgt.id) {
                        if (!links.some(l => l.source === src.id && l.target === tgt.id)) {
                            links.push({ source: src.id, target: tgt.id });
                        }
                    }
                });
            });
            
            const getColor = (d) => colorMode === 'fileType' ? (fileTypeColors[d.fileCategory] || '#888') : (layerColors[d.layer] || '#888');
            const getSize = (d) => Math.sqrt(d.complexity || 10) * 2.5 + 8;
            
            // Limits forces to keep in box
            const simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(0.8))
                .force('charge', d3.forceManyBody().strength(-400).distanceMax(300))
                .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
                .force('collision', d3.forceCollide().radius(d => getSize(d) + 15).strength(0.9))
                .force('cluster', () => {
                    nodes.forEach(d => {
                        const pos = layerPositions[d.layer] || { x: 0.5, y: 0.5 };
                        d.vx += (pos.x * (width - padding * 2) + padding - d.x) * 0.15;
                        d.vy += (pos.y * (height - padding * 2) + padding - d.y) * 0.15;
                    });
                })
                .force('bounds', () => {
                    nodes.forEach(d => {
                        const r = getSize(d) + 5;
                        d.x = Math.max(padding + r, Math.min(width - padding - r, d.x));
                        d.y = Math.max(padding + r, Math.min(height - padding - r, d.y));
                    });
                });
            
            // Links
            const link = svg.append('g').selectAll('path').data(links).join('path')
                .attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.25)').attr('stroke-width', 1.5).attr('marker-end', 'url(#arrowhead)');
            
            // Nodes
            const node = svg.append('g').selectAll('g').data(nodes).join('g').style('cursor', 'pointer')
                .call(d3.drag()
                    .on('start', (e) => { if (!e.active) simulation.alphaTarget(0.3).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
                    .on('drag', (e) => { e.subject.fx = e.x; e.subject.fy = e.y; })
                    .on('end', (e) => { if (!e.active) simulation.alphaTarget(0); e.subject.fx = null; e.subject.fy = null; }));
            
            node.append('circle').attr('r', d => getSize(d)).attr('fill', d => getColor(d)).attr('stroke', '#fff').attr('stroke-width', 2).attr('filter', 'url(#glow)')
                .on('click', (e, d) => showSummaryPanel(d))
                .on('mouseenter', function(e, d) {
                    d3.select(this).transition().duration(200).attr('r', getSize(d) * 1.2).attr('stroke-width', 3);
                    link.attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? getColor(d) : 'rgba(255,255,255,0.15)')
                        .attr('stroke-width', l => (l.source.id === d.id || l.target.id === d.id) ? 2.5 : 1);
                })
                .on('mouseleave', function(e, d) {
                    d3.select(this).transition().duration(200).attr('r', getSize(d)).attr('stroke-width', 2);
                    link.attr('stroke', 'rgba(255,255,255,0.25)').attr('stroke-width', 1.5);
                });
            
            node.append('text').attr('dy', d => getSize(d) + 14).attr('text-anchor', 'middle').attr('fill', '#fff').attr('font-size', '11px').attr('font-weight', '500').attr('pointer-events', 'none').text(d => d.baseName);
            node.append('text').attr('dy', d => getSize(d) + 26).attr('text-anchor', 'middle').attr('fill', d => getColor(d)).attr('font-size', '9px').attr('opacity', 0.8).attr('pointer-events', 'none').text(d => d.layer);
            
            simulation.on('tick', () => {
                link.attr('d', d => {
                    const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
                    const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;
                    return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
                });
                node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
            });
            
            svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', (e) => svg.selectAll('g').attr('transform', e.transform)));
        }
        
        // Render project summary
        function renderProjectSummary() {
            const el = document.getElementById('projectSummary');
            if (!projectSummary) { el.innerHTML = '<h3>Project Overview</h3><p class="project-description">No summary available.</p>'; return; }
            el.innerHTML = '<h3>Project Overview</h3><p class="project-description">' + (projectSummary.description || 'N/A') + '</p>' +
                '<div class="tech-stack">' + (projectSummary.techStack || []).map(t => '<span class="tech-badge">' + t + '</span>').join('') + '</div>';
        }
        
        function expandAll() { allFiles.forEach(f => expandedNodes.add(f.name.replace(/\\.[^.]+$/, ''))); renderStructure(); }
        function collapseAll() { expandedNodes.clear(); renderStructure(); }
        
        function getExtClass(name) { return (name.match(/\\.([^.]+)$/) || [])[1]?.toLowerCase() || ''; }
        function getExtLabel(name) { return ((name.match(/\\.([^.]+)$/) || [])[1] || 'FILE').toUpperCase(); }
        
        function toggleNode(baseName) { expandedNodes.has(baseName) ? expandedNodes.delete(baseName) : expandedNodes.add(baseName); renderStructure(); }
        
        function renderStructure() {
            const container = document.getElementById('treeContent');
            const { fileMap } = buildFileData();
            
            if (currentStructureView === 'hierarchy') {
                const rootFiles = allFiles.filter(f => {
                    const bn = f.name.replace(/\\.[^.]+$/, '').toLowerCase();
                    if (['main', 'index', 'app', 'extension'].some(n => bn.includes(n))) return true;
                    const data = fileMap.get(f.name);
                    return data && data.dependents.length === 0;
                });
                
                let html = '<div class="hierarchy-legend"><span><span class="imports-count">↓n</span> imports n files</span><span><span class="dependents-count">↑n</span> used by n files</span></div>';
                const visited = new Set();
                
                function renderNode(file, depth) {
                    const data = fileMap.get(file.name);
                    if (!data) return '';
                    const isExpanded = expandedNodes.has(data.baseName);
                    const deps = data.dependencies.map(d => fileMap.get(d.replace(/\\.[^.]+$/, ''))).filter(Boolean);
                    const hasDeps = deps.length > 0;
                    if (visited.has(data.baseName)) return '<div class="hierarchy-item" style="margin-left:' + (depth * 24) + 'px;opacity:0.5"><span class="file-ext-badge ' + getExtClass(file.name) + '">' + getExtLabel(file.name) + '</span><span class="node-name">' + file.name + '</span><span style="color:#ff6b6b;font-size:10px">REF</span></div>';
                    visited.add(data.baseName);
                    let html = '<div class="hierarchy-item" style="margin-left:' + (depth * 24) + 'px" data-toggle="' + data.baseName + '">' +
                        (hasDeps ? '<span class="expand-icon">' + (isExpanded ? '▼' : '▶') + '</span>' : '<span style="width:14px"></span>') +
                        '<span class="file-ext-badge ' + getExtClass(file.name) + '">' + getExtLabel(file.name) + '</span>' +
                        '<span class="node-name">' + file.name + '</span>' +
                        '<span class="layer-badge ' + data.layer.toLowerCase() + '">' + data.layer + '</span>' +
                        '<div class="dep-info">' + (data.dependencies.length > 0 ? '<span class="imports-count">↓' + data.dependencies.length + '</span>' : '') +
                        (data.dependents.length > 0 ? '<span class="dependents-count">↑' + data.dependents.length + '</span>' : '') + '</div></div>';
                    if (hasDeps && isExpanded) { html += '<div class="hierarchy-children">'; deps.forEach(d => html += renderNode(d, depth + 1)); html += '</div>'; }
                    visited.delete(data.baseName);
                    return html;
                }
                
                rootFiles.forEach(f => html += renderNode(f, 0));
                container.innerHTML = html;
            } else if (currentStructureView === 'layers') {
                const layers = {};
                allFiles.forEach(f => { const l = f.attributes?.layer || 'Utility'; if (!layers[l]) layers[l] = []; layers[l].push(f); });
                let html = '';
                layerOrder.forEach(layer => {
                    const files = layers[layer] || [];
                    if (files.length === 0) return;
                    html += '<div style="margin-bottom:16px"><div class="layer-badge ' + layer.toLowerCase() + '" style="display:inline-block;margin-bottom:8px;padding:6px 14px;font-size:11px">' + layer + ' (' + files.length + ')</div><div style="margin-left:8px">' +
                        files.map(f => '<div class="hierarchy-item"><span class="file-ext-badge ' + getExtClass(f.name) + '">' + getExtLabel(f.name) + '</span><span class="node-name">' + f.name + '</span></div>').join('') + '</div></div>';
                });
                container.innerHTML = html;
            } else {
                const types = {};
                allFiles.forEach(f => { const t = f.fileCategory || 'code'; if (!types[t]) types[t] = []; types[t].push(f); });
                let html = '';
                Object.entries(types).forEach(([type, files]) => {
                    html += '<div style="margin-bottom:16px"><div style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:600;margin-bottom:8px;padding:8px 12px;background:rgba(255,255,255,0.05);border-radius:8px">' + type + ' (' + files.length + ')</div><div style="margin-left:8px">' +
                        files.map(f => '<div class="hierarchy-item"><span class="file-ext-badge ' + getExtClass(f.name) + '">' + getExtLabel(f.name) + '</span><span class="node-name">' + f.name + '</span><span class="layer-badge ' + (f.attributes?.layer || 'utility').toLowerCase() + '">' + (f.attributes?.layer || 'Utility') + '</span></div>').join('') + '</div></div>';
                });
                container.innerHTML = html;
            }
        }
        
        // Initialize after a short delay to ensure DOM is ready
        setTimeout(() => {
            console.log('Initializing CodeMap, files:', allFiles.length);
            renderMapLegend();
            renderProjectSummary();
            renderStructure();
            renderMap();
        }, 100);
        
        // Event Listeners (replacing inline onclick)
        document.getElementById('btnMap').addEventListener('click', () => switchTab('map'));
        document.getElementById('btnStructure').addEventListener('click', () => switchTab('structure'));
        document.getElementById('closePanelBtn').addEventListener('click', () => hideSummaryPanel());
        document.getElementById('btnHierarchy').addEventListener('click', () => setStructureView('hierarchy'));
        document.getElementById('btnLayers').addEventListener('click', () => setStructureView('layers'));
        document.getElementById('btnTypes').addEventListener('click', () => setStructureView('types'));
        document.getElementById('btnExpand').addEventListener('click', () => expandAll());
        document.getElementById('btnCollapse').addEventListener('click', () => collapseAll());
        
        // Structure view button highlighting
        function setStructureView(mode) {
            currentStructureView = mode;
            document.getElementById('btnHierarchy').classList.toggle('active', mode === 'hierarchy');
            document.getElementById('btnLayers').classList.toggle('active', mode === 'layers');
            document.getElementById('btnTypes').classList.toggle('active', mode === 'types');
            renderStructure();
        }
        
        // Event delegation for hierarchy items (toggleNode)
        document.getElementById('treeContent').addEventListener('click', (e) => {
            const item = e.target.closest('[data-toggle]');
            if (item) {
                const baseName = item.getAttribute('data-toggle');
                toggleNode(baseName);
            }
        });
    </script>
</body>
</html>`;
}

function getNonce() {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
    return text;
}

module.exports = { getWebviewContent };
