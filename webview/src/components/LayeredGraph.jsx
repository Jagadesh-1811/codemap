import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import './LayeredGraph.css';

// Layer colors matching the theme
const layerColors = {
    'Frontend': '#00d9ff',
    'Router': '#ff6b6b',
    'Backend': '#6bcb77',
    'Database': '#ffd93d',
    'Configuration': '#ff9f43',
    'Utility': '#9d4edd'
};

// Layer order (top to bottom - data flow direction)
const layerOrder = ['Frontend', 'Router', 'Backend', 'Database', 'Configuration', 'Utility'];

export default function LayeredGraph({ data, onNodeClick }) {
    const svgRef = useRef();
    const containerRef = useRef();
    const [hoveredNode, setHoveredNode] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // Process data into layered structure
    const { layers, links, nodeMap, positions } = useMemo(() => {
        if (!data || data.length === 0) {
            return { layers: {}, links: [], nodeMap: new Map(), positions: new Map() };
        }

        // Group nodes by layer
        const layerGroups = {};
        const map = new Map();

        data.forEach(file => {
            const layer = file.attributes?.layer || 'Utility';
            if (!layerGroups[layer]) layerGroups[layer] = [];

            const node = {
                id: file.name,
                baseName: file.name.replace(/\.[^.]+$/, ''),
                layer,
                dependencies: file.attributes?.dependencies || [],
                fileCategory: file.fileCategory || file.attributes?.fileType || 'other',
                extension: file.extension || '',
                complexity: file.attributes?.complexity || 10,
                summary: file.attributes?.summary || 'No summary available',
                keywords: file.attributes?.keywords || [],
                ...file.attributes
            };

            layerGroups[layer].push(node);
            map.set(node.baseName, node);
            map.set(node.id, node);
        });

        // Build links from dependencies
        const linkList = [];
        data.forEach(file => {
            const deps = file.attributes?.dependencies || [];
            const sourceNode = map.get(file.name);
            deps.forEach(dep => {
                const depClean = dep.replace(/\.[^.]+$/, '');
                const targetNode = map.get(depClean);
                if (targetNode && sourceNode && sourceNode.id !== targetNode.id) {
                    const exists = linkList.some(l =>
                        l.source === sourceNode.id && l.target === targetNode.id
                    );
                    if (!exists) {
                        linkList.push({
                            source: sourceNode.id,
                            target: targetNode.id,
                            sourceNode,
                            targetNode
                        });
                    }
                }
            });
        });

        // Calculate fixed positions based on container dimensions
        const posMap = new Map();
        const layerHeight = 90;
        const verticalPadding = 50;
        const horizontalPadding = 60;
        const width = 800; // Base width

        let currentY = verticalPadding;

        layerOrder.forEach((layerName) => {
            const nodesInLayer = layerGroups[layerName] || [];
            if (nodesInLayer.length === 0) return;

            const layerY = currentY + layerHeight / 2;
            const availableWidth = width - horizontalPadding * 2;
            const nodeSpacing = nodesInLayer.length > 1
                ? Math.min(availableWidth / (nodesInLayer.length), 140)
                : 0;
            const totalWidth = nodeSpacing * (nodesInLayer.length - 1);
            const startX = (width - totalWidth) / 2;

            nodesInLayer.forEach((node, nodeIndex) => {
                posMap.set(node.id, {
                    x: startX + nodeIndex * nodeSpacing,
                    y: layerY,
                    layer: layerName
                });
            });

            currentY += layerHeight;
        });

        return { layers: layerGroups, links: linkList, nodeMap: map, positions: posMap };
    }, [data]);

    // Handle resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Draw the graph
    useEffect(() => {
        if (!layers || Object.keys(layers).length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;
        const layerHeight = 90;
        const nodeRadius = 26;
        const verticalPadding = 50;
        const horizontalPadding = 60;

        // Recalculate positions based on actual dimensions
        const scaledPositions = new Map();
        let currentY = verticalPadding;

        layerOrder.forEach((layerName) => {
            const nodesInLayer = layers[layerName] || [];
            if (nodesInLayer.length === 0) return;

            const layerY = currentY + layerHeight / 2;
            const availableWidth = width - horizontalPadding * 2;
            const nodeSpacing = nodesInLayer.length > 1
                ? Math.min(availableWidth / nodesInLayer.length, 140)
                : 0;
            const totalWidth = nodeSpacing * (nodesInLayer.length - 1);
            const startX = (width - totalWidth) / 2;

            nodesInLayer.forEach((node, nodeIndex) => {
                scaledPositions.set(node.id, {
                    x: startX + nodeIndex * nodeSpacing,
                    y: layerY,
                    layer: layerName
                });
            });

            currentY += layerHeight;
        });

        // Create defs
        const defs = svg.append('defs');

        // Arrow markers - larger and more visible
        Object.entries(layerColors).forEach(([layer, color]) => {
            defs.append('marker')
                .attr('id', `arrow-${layer.toLowerCase()}`)
                .attr('viewBox', '0 -6 12 12')
                .attr('refX', 28)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 10)
                .attr('markerHeight', 10)
                .append('path')
                .attr('d', 'M0,-5L12,0L0,5Z')
                .attr('fill', color);
        });

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

        // Draw layer backgrounds
        const layerBg = svg.append('g').attr('class', 'layer-backgrounds');
        let bgY = verticalPadding - 15;

        layerOrder.forEach((layerName) => {
            const nodesInLayer = layers[layerName] || [];
            if (nodesInLayer.length === 0) return;

            // Layer background
            layerBg.append('rect')
                .attr('x', 20)
                .attr('y', bgY)
                .attr('width', width - 40)
                .attr('height', layerHeight - 5)
                .attr('rx', 10)
                .attr('fill', layerColors[layerName])
                .attr('opacity', 0.06);

            // Layer label
            layerBg.append('text')
                .attr('x', 35)
                .attr('y', bgY + 18)
                .attr('fill', layerColors[layerName])
                .attr('font-size', '10px')
                .attr('font-weight', '600')
                .attr('opacity', 0.8)
                .text(layerName.toUpperCase());

            bgY += layerHeight;
        });

        // Draw links
        const linkGroup = svg.append('g').attr('class', 'links');

        links.forEach(link => {
            const sourcePos = scaledPositions.get(link.source);
            const targetPos = scaledPositions.get(link.target);

            if (!sourcePos || !targetPos) return;

            const sourceColor = layerColors[link.sourceNode?.layer] || '#888';
            const markerName = `arrow-${(link.sourceNode?.layer || 'utility').toLowerCase()}`;

            // Calculate curve
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;

            let path;
            if (Math.abs(dx) < 20) {
                // Vertical line with slight curve
                const midY = (sourcePos.y + targetPos.y) / 2;
                path = `M${sourcePos.x},${sourcePos.y + nodeRadius} 
                        Q${sourcePos.x + 30},${midY} 
                        ${targetPos.x},${targetPos.y - nodeRadius}`;
            } else {
                // Curved path
                const midX = (sourcePos.x + targetPos.x) / 2;
                const midY = (sourcePos.y + targetPos.y) / 2;
                const curveOffset = dy > 0 ? Math.min(Math.abs(dx) * 0.3, 40) : 0;
                path = `M${sourcePos.x},${sourcePos.y + nodeRadius} 
                        Q${midX},${midY + curveOffset} 
                        ${targetPos.x},${targetPos.y - nodeRadius}`;
            }

            // Draw shadow/glow line first
            linkGroup.append('path')
                .attr('d', path)
                .attr('fill', 'none')
                .attr('stroke', sourceColor)
                .attr('stroke-width', 6)
                .attr('opacity', 0.15)
                .attr('filter', 'url(#link-glow)');

            // Main visible link
            linkGroup.append('path')
                .attr('d', path)
                .attr('fill', 'none')
                .attr('stroke', sourceColor)
                .attr('stroke-width', 3)
                .attr('opacity', 0.8)
                .attr('stroke-linecap', 'round')
                .attr('marker-end', `url(#${markerName})`)
                .attr('class', 'link-path')
                .attr('data-source', link.source)
                .attr('data-target', link.target);
        });

        // Draw nodes
        const nodeGroup = svg.append('g').attr('class', 'nodes');

        scaledPositions.forEach((pos, nodeId) => {
            const node = nodeMap.get(nodeId);
            if (!node) return;

            const color = layerColors[pos.layer] || '#888';
            const g = nodeGroup.append('g')
                .attr('class', 'node-group')
                .attr('transform', `translate(${pos.x}, ${pos.y})`)
                .style('cursor', 'pointer');

            // Main circle background
            g.append('circle')
                .attr('r', nodeRadius)
                .attr('fill', 'rgba(10, 10, 20, 0.9)')
                .attr('stroke', color)
                .attr('stroke-width', 2.5);

            // File extension badge
            const ext = node.extension?.replace('.', '').toUpperCase() || 'FILE';
            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('fill', color)
                .attr('font-size', '10px')
                .attr('font-weight', '700')
                .attr('font-family', "'SF Mono', Monaco, Consolas, monospace")
                .text(ext.slice(0, 4));

            // Node name label
            g.append('text')
                .attr('y', nodeRadius + 14)
                .attr('text-anchor', 'middle')
                .attr('fill', '#fff')
                .attr('font-size', '10px')
                .attr('font-weight', '500')
                .text(node.baseName.length > 12 ? node.baseName.slice(0, 10) + '..' : node.baseName);

            // Hover effects
            g.on('mouseenter', function () {
                d3.select(this).select('circle')
                    .transition()
                    .duration(100)
                    .attr('stroke-width', 4)
                    .attr('r', nodeRadius + 3);

                setHoveredNode(node);

                // Highlight connected links
                linkGroup.selectAll('.link-path').each(function () {
                    const el = d3.select(this);
                    const src = el.attr('data-source');
                    const tgt = el.attr('data-target');
                    if (src === nodeId || tgt === nodeId) {
                        el.attr('opacity', 0.9).attr('stroke-width', 3);
                    } else {
                        el.attr('opacity', 0.1);
                    }
                });
            });

            g.on('mouseleave', function () {
                d3.select(this).select('circle')
                    .transition()
                    .duration(100)
                    .attr('stroke-width', 2.5)
                    .attr('r', nodeRadius);

                setHoveredNode(null);

                linkGroup.selectAll('.link-path')
                    .attr('opacity', 0.4)
                    .attr('stroke-width', 2);
            });

            g.on('click', () => {
                setSelectedNode(node);
                onNodeClick && onNodeClick(node);
            });
        });

    }, [layers, links, nodeMap, dimensions, onNodeClick]);

    // Get dependents (files that import this file)
    const getDependents = (node) => {
        return links
            .filter(l => l.target === node.id)
            .map(l => l.sourceNode?.baseName || l.source);
    };

    return (
        <div className="layered-graph" ref={containerRef}>
            <div className="graph-header">
                <span className="graph-title">Architecture Map</span>
                <div className="graph-legend">
                    {layerOrder.map(layer => (
                        <span key={layer} className="legend-item" style={{ color: layerColors[layer] }}>
                            <span className="legend-dot" style={{ background: layerColors[layer] }}></span>
                            {layer}
                        </span>
                    ))}
                </div>
            </div>

            <div className="graph-content">
                <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />

                {/* File Summary Panel */}
                {selectedNode && (
                    <div className="file-summary-panel">
                        <button className="close-panel" onClick={() => setSelectedNode(null)}>×</button>
                        <div className="summary-header">
                            <span className="file-ext" style={{ color: layerColors[selectedNode.layer] }}>
                                {selectedNode.extension?.replace('.', '').toUpperCase() || 'FILE'}
                            </span>
                            <h3>{selectedNode.baseName}</h3>
                            <span className="layer-tag" style={{
                                background: `${layerColors[selectedNode.layer]}20`,
                                color: layerColors[selectedNode.layer],
                                border: `1px solid ${layerColors[selectedNode.layer]}40`
                            }}>
                                {selectedNode.layer}
                            </span>
                        </div>

                        <div className="summary-content">
                            <div className="summary-section">
                                <h4>Summary</h4>
                                <p>{selectedNode.summary}</p>
                            </div>

                            {selectedNode.keywords?.length > 0 && (
                                <div className="summary-section">
                                    <h4>Keywords</h4>
                                    <div className="keyword-tags">
                                        {selectedNode.keywords.map(kw => (
                                            <span key={kw} className="keyword-tag">{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="summary-section">
                                <h4>Complexity</h4>
                                <div className="complexity-bar">
                                    <div
                                        className="complexity-fill"
                                        style={{
                                            width: `${Math.min(selectedNode.complexity, 100)}%`,
                                            background: selectedNode.complexity > 50 ? '#ff6b6b' :
                                                selectedNode.complexity > 25 ? '#ffd93d' : '#6bcb77'
                                        }}
                                    ></div>
                                    <span>{selectedNode.complexity}</span>
                                </div>
                            </div>

                            <div className="summary-section">
                                <h4>Dependencies</h4>
                                {selectedNode.dependencies?.length > 0 ? (
                                    <ul className="dep-list">
                                        {selectedNode.dependencies.map(dep => (
                                            <li key={dep} className="dep-item imports">↓ {dep}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-deps">No dependencies</p>
                                )}
                            </div>

                            <div className="summary-section">
                                <h4>Used By</h4>
                                {getDependents(selectedNode).length > 0 ? (
                                    <ul className="dep-list">
                                        {getDependents(selectedNode).map(dep => (
                                            <li key={dep} className="dep-item dependents">↑ {dep}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-deps">Not imported by other files</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Hover tooltip */}
                {hoveredNode && !selectedNode && (
                    <div className="hover-tooltip">
                        <strong>{hoveredNode.baseName}</strong>
                        <span className="tooltip-summary">{hoveredNode.summary}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export { layerColors };
