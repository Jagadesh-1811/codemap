import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

// Layer colors for architectural layers
const layerColors = {
    'Frontend': '#00d9ff',
    'Router': '#ff6b6b',
    'Database': '#ffd93d',
    'Backend': '#6bcb77',
    'Configuration': '#ff9f43',
    'Utility': '#9d4edd'
};

// File type colors (used as secondary indicator)
const fileTypeColors = {
    'code': '#00d9ff',
    'style': '#ff6b9d',
    'markup': '#ffa502',
    'data': '#ff9f43',
    'backend': '#6bcb77',
    'documentation': '#a29bfe',
    'script': '#fd79a8',
    'other': '#888'
};

// Layer positions for clustering (normalized 0-1)
const layerPositions = {
    'Frontend': { x: 0.25, y: 0.3 },
    'Router': { x: 0.5, y: 0.5 },
    'Backend': { x: 0.75, y: 0.3 },
    'Database': { x: 0.75, y: 0.7 },
    'Configuration': { x: 0.5, y: 0.85 },
    'Utility': { x: 0.25, y: 0.85 }
};

export default function ForceGraph({ data, onNodeClick, colorBy = 'layer' }) {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        const padding = 80;

        // Create defs for gradients and filters
        const defs = svg.append('defs');
        
        // Glow filter for nodes
        const filter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Arrow marker for links
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .append('path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', 'rgba(255,255,255,0.4)');

        // Build nodes with initial positions based on layer
        const nodes = data.map(d => {
            const layer = d.attributes?.layer || 'Utility';
            const pos = layerPositions[layer] || { x: 0.5, y: 0.5 };
            return {
                id: d.name,
                baseName: d.name.replace(/\.[^.]+$/, ''),
                fileCategory: d.fileCategory || d.attributes?.fileType || 'other',
                extension: d.extension || '',
                layer: layer,
                // Initial position based on layer cluster
                x: pos.x * (width - padding * 2) + padding + (Math.random() - 0.5) * 100,
                y: pos.y * (height - padding * 2) + padding + (Math.random() - 0.5) * 100,
                ...d.attributes
            };
        });

        // Build node map
        const nodeMap = new Map();
        nodes.forEach(n => {
            nodeMap.set(n.baseName, n);
            nodeMap.set(n.id, n);
        });

        // Build links from dependencies
        const links = [];
        data.forEach(file => {
            const deps = file.attributes?.dependencies || [];
            const sourceNode = nodeMap.get(file.name);
            deps.forEach(dep => {
                const depClean = dep.replace(/\.[^.]+$/, '');
                const targetNode = nodeMap.get(depClean);
                if (targetNode && sourceNode && sourceNode.id !== targetNode.id) {
                    // Avoid duplicate links
                    const exists = links.some(l => 
                        l.source === sourceNode.id && l.target === targetNode.id
                    );
                    if (!exists) {
                        links.push({
                            source: sourceNode.id,
                            target: targetNode.id
                        });
                    }
                }
            });
        });

        // Create layer cluster zones (background)
        const layerGroups = {};
        nodes.forEach(n => {
            if (!layerGroups[n.layer]) layerGroups[n.layer] = [];
            layerGroups[n.layer].push(n);
        });

        // D3 Force Simulation with layer clustering
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(120)
                .strength(0.8))
            .force('charge', d3.forceManyBody()
                .strength(-400)
                .distanceMax(300))
            .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
            .force('collision', d3.forceCollide()
                .radius(d => getNodeSize(d) + 15)
                .strength(0.9))
            // Cluster force to keep same-layer nodes together
            .force('cluster', forceCluster(nodes, width, height, padding))
            // Keep nodes within bounds
            .force('bounds', forceBounds(width, height, padding));

        // Custom cluster force
        function forceCluster(nodes, width, height, padding) {
            const strength = 0.15;
            return () => {
                nodes.forEach(d => {
                    const pos = layerPositions[d.layer] || { x: 0.5, y: 0.5 };
                    const targetX = pos.x * (width - padding * 2) + padding;
                    const targetY = pos.y * (height - padding * 2) + padding;
                    d.vx += (targetX - d.x) * strength;
                    d.vy += (targetY - d.y) * strength;
                });
            };
        }

        // Bounds force
        function forceBounds(width, height, padding) {
            return () => {
                nodes.forEach(d => {
                    const r = getNodeSize(d) + 5;
                    d.x = Math.max(padding + r, Math.min(width - padding - r, d.x));
                    d.y = Math.max(padding + r, Math.min(height - padding - r, d.y));
                });
            };
        }

        // Get node size based on complexity
        function getNodeSize(d) {
            return Math.sqrt(d.complexity || 10) * 2.5 + 8;
        }

        // Render links with gradient
        const linkGroup = svg.append('g').attr('class', 'links');
        const link = linkGroup.selectAll('path')
            .data(links)
            .join('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255,255,255,0.25)')
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#arrowhead)');

        // Render nodes
        const nodeGroup = svg.append('g').attr('class', 'nodes');
        const node = nodeGroup.selectAll('g')
            .data(nodes)
            .join('g')
            .attr('class', 'node')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Get color based on colorBy mode
        const getNodeColor = (d) => {
            if (colorBy === 'fileType') {
                return fileTypeColors[d.fileCategory] || fileTypeColors.other;
            }
            return layerColors[d.layer] || '#888';
        };

        // Render node circles with glow
        node.append('circle')
            .attr('r', d => getNodeSize(d))
            .attr('fill', d => getNodeColor(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('filter', 'url(#glow)')
            .on('click', (event, d) => onNodeClick && onNodeClick(d))
            .on('mouseenter', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', getNodeSize(d) * 1.2)
                    .attr('stroke-width', 3);
                // Highlight connected links
                link.attr('stroke', l => 
                    (l.source.id === d.id || l.target.id === d.id) 
                        ? getNodeColor(d) 
                        : 'rgba(255,255,255,0.15)'
                ).attr('stroke-width', l =>
                    (l.source.id === d.id || l.target.id === d.id) ? 2.5 : 1
                );
            })
            .on('mouseleave', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', getNodeSize(d))
                    .attr('stroke-width', 2);
                link.attr('stroke', 'rgba(255,255,255,0.25)')
                    .attr('stroke-width', 1.5);
            });

        // Add labels
        node.append('text')
            .attr('dy', d => getNodeSize(d) + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('pointer-events', 'none')
            .text(d => d.baseName);

        // Add small layer indicator
        node.append('text')
            .attr('dy', d => getNodeSize(d) + 26)
            .attr('text-anchor', 'middle')
            .attr('fill', d => getNodeColor(d))
            .attr('font-size', '9px')
            .attr('opacity', 0.8)
            .attr('pointer-events', 'none')
            .text(d => d.layer);

        // Tick handler - use curved links
        simulation.on('tick', () => {
            link.attr('d', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        // Run simulation for a bit then slow down
        simulation.alpha(1).restart();

        return () => simulation.stop();
    }, [data, onNodeClick, colorBy]);

    return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
}

// Export colors for use in legend
export { layerColors, fileTypeColors };
