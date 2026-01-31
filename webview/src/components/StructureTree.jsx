import { useState, useMemo } from 'react';
import './StructureTree.css';

// File type icons - using CSS classes instead of emojis
const fileIcons = {
    'code': 'JS',
    'style': 'CSS',
    'markup': 'HTML',
    'data': 'CFG',
    'backend': 'SRV',
    'documentation': 'DOC',
    'script': 'SH',
    'folder': 'DIR',
    'other': 'FILE'
};

// Extension to icon mapping
const extIcons = {
    '.js': 'JS',
    '.jsx': 'JSX',
    '.ts': 'TS',
    '.tsx': 'TSX',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.html': 'HTML',
    '.json': 'JSON',
    '.md': 'MD',
    '.py': 'PY',
    '.java': 'JAVA',
    '.go': 'GO',
    '.rs': 'RS',
    '.php': 'PHP',
    '.rb': 'RB',
    '.sh': 'SH',
    '.yaml': 'YAML',
    '.yml': 'YML',
    '.env': 'ENV'
};

// Layer hierarchy order (top to bottom)
const layerHierarchy = ['Frontend', 'Router', 'Backend', 'Database', 'Configuration', 'Utility'];

export default function StructureTree({ tree, onNodeClick, projectSummary }) {
    const [expanded, setExpanded] = useState({});
    const [viewMode, setViewMode] = useState('hierarchy'); // 'tree' | 'hierarchy' | 'layers' | 'types'
    const [selectedFile, setSelectedFile] = useState(null);
    const [hierarchyExpanded, setHierarchyExpanded] = useState({});

    // Build dependency graph and hierarchy data
    const { allFiles, fileMap, dependencyGraph, hierarchyTree } = useMemo(() => {
        const files = [];
        const map = new Map();

        // Flatten all files from tree
        const flattenFiles = (node, parentPath = '') => {
            if (node.type === 'file') {
                const fileData = {
                    ...node,
                    fullPath: parentPath ? `${parentPath}/${node.name}` : node.name,
                    baseName: node.name.replace(/\.[^.]+$/, ''),
                    dependencies: node.attributes?.dependencies || [],
                    dependents: [], // Files that depend on this file
                    layer: node.attributes?.layer || 'Utility'
                };
                files.push(fileData);
                map.set(fileData.baseName, fileData);
                map.set(node.name, fileData);
            }
            if (node.children) {
                node.children.forEach(child => flattenFiles(child, node.name));
            }
        };
        if (tree) flattenFiles(tree);

        // Build dependency graph - calculate who depends on whom
        const graph = { nodes: [], links: [] };
        files.forEach(file => {
            graph.nodes.push({
                id: file.baseName,
                name: file.name,
                layer: file.layer,
                fileCategory: file.fileCategory
            });

            // Process dependencies
            file.dependencies.forEach(dep => {
                const depClean = dep.replace(/\.[^.]+$/, '');
                const targetFile = map.get(depClean);
                if (targetFile) {
                    // Add this file as a dependent of the target
                    if (!targetFile.dependents.includes(file.baseName)) {
                        targetFile.dependents.push(file.baseName);
                    }
                    graph.links.push({
                        source: file.baseName,
                        target: depClean
                    });
                }
            });
        });

        // Build hierarchical tree based on dependencies
        // Root nodes are files with no dependencies (or external only)
        const buildHierarchy = () => {
            const visited = new Set();
            const hierarchy = [];

            // Find root files (files that are not imported by anyone OR entry points)
            const rootFiles = files.filter(f => {
                // Entry points
                if (['main', 'index', 'app', 'App', 'extension'].some(n => f.baseName.toLowerCase().includes(n.toLowerCase()))) {
                    return true;
                }
                // Files with no dependents (not imported by anyone)
                return f.dependents.length === 0;
            });

            // Build tree recursively
            const buildNode = (file, depth = 0) => {
                if (visited.has(file.baseName) || depth > 10) {
                    return { ...file, isCircular: visited.has(file.baseName), children: [] };
                }
                visited.add(file.baseName);

                // Get files this one depends on
                const childFiles = file.dependencies
                    .map(dep => map.get(dep.replace(/\.[^.]+$/, '')))
                    .filter(Boolean);

                return {
                    ...file,
                    children: childFiles.map(child => buildNode(child, depth + 1))
                };
            };

            // Sort root files by layer priority
            rootFiles.sort((a, b) => {
                const aIdx = layerHierarchy.indexOf(a.layer);
                const bIdx = layerHierarchy.indexOf(b.layer);
                return aIdx - bIdx;
            });

            rootFiles.forEach(file => {
                visited.clear();
                hierarchy.push(buildNode(file));
            });

            return hierarchy;
        };

        return {
            allFiles: files,
            fileMap: map,
            dependencyGraph: graph,
            hierarchyTree: buildHierarchy()
        };
    }, [tree]);

    // Toggle folder expansion
    const toggleExpand = (path) => {
        setExpanded(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    // Toggle hierarchy node expansion
    const toggleHierarchyExpand = (id) => {
        setHierarchyExpanded(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Expand all hierarchy nodes
    const expandAllHierarchy = () => {
        const allIds = {};
        const collectIds = (nodes) => {
            nodes.forEach(node => {
                allIds[node.baseName] = true;
                if (node.children?.length) collectIds(node.children);
            });
        };
        collectIds(hierarchyTree);
        setHierarchyExpanded(allIds);
    };

    // Expand all folders
    const expandAll = () => {
        const allPaths = {};
        const collectPaths = (node, prefix = '') => {
            const path = prefix ? `${prefix}/${node.name}` : node.name;
            if (node.type === 'folder') {
                allPaths[path] = true;
                node.children?.forEach(child => collectPaths(child, path));
            }
        };
        if (tree) collectPaths(tree);
        setExpanded(allPaths);
    };

    // Collapse all folders
    const collapseAll = () => {
        setExpanded({});
        setHierarchyExpanded({});
    };

    // Get icon for file/folder
    const getIcon = (node) => {
        if (node.type === 'folder') return fileIcons.folder;
        const ext = node.extension || '';
        return extIcons[ext] || fileIcons[node.fileCategory || node.attributes?.fileType] || fileIcons.other;
    };

    // Render tree node recursively
    const renderNode = (node, path = '', depth = 0) => {
        const nodePath = path ? `${path}/${node.name}` : node.name;
        const isExpanded = expanded[nodePath];
        const isFolder = node.type === 'folder';

        return (
            <div key={nodePath} className="tree-node" style={{ paddingLeft: `${depth * 16}px` }}>
                <div
                    className={`tree-item ${isFolder ? 'folder' : 'file'}`}
                    onClick={() => {
                        if (isFolder) {
                            toggleExpand(nodePath);
                        } else {
                            onNodeClick && onNodeClick({
                                id: node.name,
                                ...node.attributes,
                                fileCategory: node.fileCategory
                            });
                        }
                    }}
                >
                    {isFolder && (
                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    )}
                    <span className="node-icon file-ext-badge">{getIcon(node)}</span>
                    <span className="node-name">{node.name}</span>
                    {!isFolder && node.attributes?.layer && (
                        <span className={`layer-badge ${node.attributes.layer.toLowerCase()}`}>
                            {node.attributes.layer}
                        </span>
                    )}
                </div>
                {isFolder && isExpanded && node.children && (
                    <div className="tree-children">
                        {node.children.map(child => renderNode(child, nodePath, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Render flat list grouped by layer
    const renderByLayers = (data) => {
        const layers = {};
        const flattenFiles = (node) => {
            if (node.type === 'file') {
                const layer = node.attributes?.layer || 'Utility';
                if (!layers[layer]) layers[layer] = [];
                layers[layer].push(node);
            }
            node.children?.forEach(flattenFiles);
        };
        if (tree) flattenFiles(tree);

        return (
            <div className="layers-view">
                {Object.entries(layers).map(([layer, files]) => (
                    <div key={layer} className="layer-group">
                        <h4 className={`layer-header ${layer.toLowerCase()}`}>
                            {layer} ({files.length})
                        </h4>
                        <div className="layer-files">
                            {files.map(file => (
                                <div
                                    key={file.path}
                                    className="layer-file"
                                    onClick={() => onNodeClick && onNodeClick({
                                        id: file.name,
                                        ...file.attributes,
                                        fileCategory: file.fileCategory
                                    })}
                                >
                                    <span className="node-icon file-ext-badge">{getIcon(file)}</span>
                                    <span className="node-name">{file.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Render flat list grouped by file type
    const renderByFileType = () => {
        const types = {};
        const flattenFiles = (node) => {
            if (node.type === 'file') {
                const type = node.fileCategory || node.attributes?.fileType || 'other';
                if (!types[type]) types[type] = [];
                types[type].push(node);
            }
            node.children?.forEach(flattenFiles);
        };
        if (tree) flattenFiles(tree);

        const typeLabels = {
            'code': 'JavaScript/TypeScript',
            'style': 'Stylesheets',
            'markup': 'HTML/Markup',
            'data': 'Config/Data',
            'backend': 'Backend Code',
            'documentation': 'Documentation',
            'script': 'Shell Scripts',
            'other': 'Other Files'
        };

        return (
            <div className="types-view">
                {Object.entries(types).map(([type, files]) => (
                    <div key={type} className="type-group">
                        <h4 className={`type-header ${type}`}>
                            <span className="type-icon">{fileIcons[type]}</span> {typeLabels[type] || type} ({files.length})
                        </h4>
                        <div className="type-files">
                            {files.map(file => (
                                <div
                                    key={file.path}
                                    className="type-file"
                                    onClick={() => onNodeClick && onNodeClick({
                                        id: file.name,
                                        ...file.attributes,
                                        fileCategory: file.fileCategory
                                    })}
                                >
                                    <span className="node-icon file-ext-badge">{extIcons[file.extension] || 'FILE'}</span>
                                    <span className="node-name">{file.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Render hierarchical dependency tree
    const renderHierarchyNode = (node, depth = 0, isLast = true, parentLines = []) => {
        const isExpanded = hierarchyExpanded[node.baseName];
        const hasChildren = node.children && node.children.length > 0;
        const deps = node.dependencies?.length || 0;
        const dependents = node.dependents?.length || 0;

        // Build tree line prefix
        const getPrefix = () => {
            let prefix = '';
            parentLines.forEach((showLine, idx) => {
                if (idx < parentLines.length) {
                    prefix += showLine ? '│  ' : '   ';
                }
            });
            return prefix;
        };

        const handleClick = () => {
            if (hasChildren) {
                toggleHierarchyExpand(node.baseName);
            }
            setSelectedFile(node);
            onNodeClick && onNodeClick({
                id: node.name,
                ...node.attributes,
                fileCategory: node.fileCategory,
                dependencies: node.dependencies,
                dependents: node.dependents
            });
        };

        return (
            <div key={`${node.baseName}-${depth}`} className="hierarchy-node">
                <div
                    className={`hierarchy-item ${selectedFile?.baseName === node.baseName ? 'selected' : ''}`}
                    onClick={handleClick}
                >
                    <span className="tree-prefix">{getPrefix()}{isLast ? '└─' : '├─'}</span>
                    {hasChildren && (
                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    )}
                    <span className="node-icon file-ext-badge">{getIcon(node)}</span>
                    <span className="node-name">{node.name}</span>
                    <span className={`layer-badge ${node.layer?.toLowerCase() || 'utility'}`}>
                        {node.layer || 'Utility'}
                    </span>
                    {node.isCircular && (
                        <span className="circular-badge" title="Circular dependency">REF</span>
                    )}
                    <span className="dep-info">
                        {deps > 0 && <span className="imports-count" title={`Imports ${deps} files`}>↓{deps}</span>}
                        {dependents > 0 && <span className="dependents-count" title={`Used by ${dependents} files`}>↑{dependents}</span>}
                    </span>
                </div>
                {hasChildren && isExpanded && (
                    <div className="hierarchy-children">
                        {node.children.map((child, idx) =>
                            renderHierarchyNode(
                                child,
                                depth + 1,
                                idx === node.children.length - 1,
                                [...parentLines, !isLast]
                            )
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render the dependency hierarchy view
    const renderDependencyHierarchy = () => {
        if (hierarchyTree.length === 0) {
            return (
                <div className="no-data">
                    <p>No dependency data available</p>
                </div>
            );
        }

        return (
            <div className="hierarchy-view">
                <div className="hierarchy-legend">
                    <span className="legend-item"><span className="imports-count">↓n</span> imports n files</span>
                    <span className="legend-item"><span className="dependents-count">↑n</span> used by n files</span>
                    <span className="legend-item"><span className="circular-badge">REF</span> circular ref</span>
                </div>
                <div className="hierarchy-tree">
                    {hierarchyTree.map((node, idx) =>
                        renderHierarchyNode(node, 0, idx === hierarchyTree.length - 1, [])
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="structure-tree">
            {/* Project Summary Header */}
            {projectSummary && (
                <div className="project-summary">
                    <h3>Project Overview</h3>
                    <p className="project-description">{projectSummary.description}</p>
                    {projectSummary.techStack && (
                        <div className="tech-stack">
                            {projectSummary.techStack.map(tech => (
                                <span key={tech} className="tech-badge">{tech}</span>
                            ))}
                        </div>
                    )}
                    {projectSummary.architecture && (
                        <div className="architecture-badge">
                            {projectSummary.architecture}
                        </div>
                    )}
                    {projectSummary.mainFeatures && (
                        <div className="features">
                            <strong>Features:</strong>
                            <ul>
                                {projectSummary.mainFeatures.map(f => <li key={f}>{f}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* View Mode Toggle */}
            <div className="view-controls">
                <button
                    className={viewMode === 'hierarchy' ? 'active' : ''}
                    onClick={() => setViewMode('hierarchy')}
                    title="Show dependency hierarchy"
                >
                    Hierarchy
                </button>
                <button
                    className={viewMode === 'tree' ? 'active' : ''}
                    onClick={() => setViewMode('tree')}
                    title="Show folder structure"
                >
                    Folders
                </button>
                <button
                    className={viewMode === 'layers' ? 'active' : ''}
                    onClick={() => setViewMode('layers')}
                    title="Group by layer"
                >
                    Layers
                </button>
                <button
                    className={viewMode === 'types' ? 'active' : ''}
                    onClick={() => setViewMode('types')}
                    title="Group by file type"
                >
                    Types
                </button>
                {(viewMode === 'tree' || viewMode === 'hierarchy') && (
                    <>
                        <button onClick={viewMode === 'hierarchy' ? expandAllHierarchy : expandAll}>+ Expand</button>
                        <button onClick={collapseAll}>- Collapse</button>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="tree-content">
                {viewMode === 'hierarchy' && renderDependencyHierarchy()}
                {viewMode === 'tree' && tree && renderNode(tree)}
                {viewMode === 'layers' && renderByLayers()}
                {viewMode === 'types' && renderByFileType()}
            </div>
        </div>
    );
}
