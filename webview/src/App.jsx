import { useState, useEffect } from 'react';
import LayeredGraph from './components/LayeredGraph';
import StructureTree from './components/StructureTree';
import './App.css';

// Default sample data - used when no analysis data is available
const sampleData = {
  tree: {
    name: 'project',
    type: 'folder',
    path: '/project',
    attributes: { purpose: 'Main project folder', folderType: 'component' },
    children: [
      {
        name: 'src',
        type: 'folder',
        path: '/project/src',
        attributes: { purpose: 'Source code', folderType: 'component' },
        children: [
          { name: 'main.jsx', type: 'file', fileCategory: 'code', extension: '.jsx', attributes: { layer: 'Frontend', complexity: 15, summary: 'Application entry point', keywords: ['React', 'DOM'], dependencies: ['App'], aiGenerated: true } },
          { name: 'App.jsx', type: 'file', fileCategory: 'code', extension: '.jsx', attributes: { layer: 'Frontend', complexity: 35, summary: 'Main application component', keywords: ['React', 'JSX'], dependencies: ['ForceGraph', 'StructureTree', 'App.css'], aiGenerated: true } },
          { name: 'App.css', type: 'file', fileCategory: 'style', extension: '.css', attributes: { layer: 'Frontend', complexity: 20, summary: 'Main application styles', keywords: ['Flexbox', 'Grid'], dependencies: [], aiGenerated: false } },
          {
            name: 'components',
            type: 'folder',
            path: '/project/src/components',
            attributes: { purpose: 'React components', folderType: 'component' },
            children: [
              { name: 'ForceGraph.jsx', type: 'file', fileCategory: 'code', extension: '.jsx', attributes: { layer: 'Frontend', complexity: 55, summary: 'D3 force-directed graph visualization', keywords: ['D3', 'React Hook', 'SVG'], dependencies: [], aiGenerated: true } },
              { name: 'StructureTree.jsx', type: 'file', fileCategory: 'code', extension: '.jsx', attributes: { layer: 'Frontend', complexity: 45, summary: 'Hierarchical tree structure view', keywords: ['React', 'Tree'], dependencies: ['StructureTree.css'], aiGenerated: true } },
              { name: 'StructureTree.css', type: 'file', fileCategory: 'style', extension: '.css', attributes: { layer: 'Frontend', complexity: 25, summary: 'Tree component styles', keywords: ['CSS'], dependencies: [], aiGenerated: false } },
            ]
          }
        ]
      },
      {
        name: 'server',
        type: 'folder',
        path: '/project/server',
        attributes: { purpose: 'Backend server', folderType: 'service' },
        children: [
          { name: 'index.js', type: 'file', fileCategory: 'code', extension: '.js', attributes: { layer: 'Backend', complexity: 20, summary: 'Server entry point', keywords: ['Express', 'Node'], dependencies: ['routes', 'api'], aiGenerated: true } },
          { name: 'routes.js', type: 'file', fileCategory: 'code', extension: '.js', attributes: { layer: 'Router', complexity: 30, summary: 'Express route definitions', keywords: ['express', 'router'], dependencies: ['api'], aiGenerated: true } },
          { name: 'api.js', type: 'file', fileCategory: 'code', extension: '.js', attributes: { layer: 'Backend', complexity: 25, summary: 'API service layer', keywords: ['fetch', 'API'], dependencies: [], aiGenerated: true } },
        ]
      },
      { name: 'index.html', type: 'file', fileCategory: 'markup', extension: '.html', attributes: { layer: 'Frontend', complexity: 10, summary: 'HTML entry point', keywords: ['HTML5'], dependencies: ['main.jsx'], aiGenerated: false } },
      { name: 'package.json', type: 'file', fileCategory: 'data', extension: '.json', attributes: { layer: 'Configuration', complexity: 5, summary: 'Project dependencies config', keywords: ['NPM Scripts', 'Dependencies'], dependencies: [], aiGenerated: false } },
      { name: 'README.md', type: 'file', fileCategory: 'documentation', extension: '.md', attributes: { layer: 'Utility', complexity: 8, summary: 'Project documentation', keywords: ['Markdown'], dependencies: [], aiGenerated: false } },
    ]
  },
  files: [],
  projectSummary: {
    description: 'A React-based code visualization tool using D3.js for interactive dependency graphs',
    techStack: ['React', 'D3.js', 'CSS3', 'Node.js'],
    architecture: 'Full-stack',
    mainFeatures: ['Force-directed graphs', 'File tree visualization', 'Layer analysis', 'Dependency hierarchy']
  },
  stats: { totalFiles: 12 }
};

// Flatten tree for ForceGraph
function flattenTree(node, result = []) {
  if (node.type === 'file') {
    result.push(node);
  }
  if (node.children) {
    node.children.forEach(child => flattenTree(child, result));
  }
  return result;
}

// Count AI analyzed files from tree
function countAIAnalyzed(node, count = { value: 0 }) {
  if (node.type === 'file' && node.attributes?.aiGenerated) {
    count.value++;
  }
  if (node.children) {
    node.children.forEach(child => countAIAnalyzed(child, count));
  }
  return count.value;
}

function App() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [data, setData] = useState(sampleData);
  const [viewTab, setViewTab] = useState('map'); // 'map' | 'structure'
  const [loading, setLoading] = useState(true);

  // Load analysis data from JSON file
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/analysis-data.json?t=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (response.ok) {
          const analysisData = await response.json();
          if (analysisData && (analysisData.tree || analysisData.files)) {
            setData(analysisData);
          }
        }
      } catch (e) {
        console.log('Using sample data (no analysis-data.json found)');
      }
      setLoading(false);
    };
    loadData();

    // Poll for updates every 2 seconds
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const flatFiles = flattenTree(data.tree);

  // Calculate actual stats dynamically from data
  const totalFiles = flatFiles.length;
  const aiAnalyzedCount = countAIAnalyzed(data.tree);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>CodeMap Neural Engine v3</h1>
        <div className="header-controls">
          <div className="stats-badges">
            <span className="stat-badge files">
              <span className="badge-icon">F</span>
              <span className="badge-text">Files: {totalFiles}</span>
            </span>
            <span
              className={`stat-badge ai ${aiAnalyzedCount > 0 ? 'active' : 'inactive'}`}
              title="Files analyzed by Gemini AI"
            >
              <span className="badge-icon">AI</span>
              <span className="badge-text">AI Analyzed: {aiAnalyzedCount}</span>
            </span>
          </div>
          <div className="tab-buttons">
            <button
              className={viewTab === 'map' ? 'active' : ''}
              onClick={() => setViewTab('map')}
            >
              Map
            </button>
            <button
              className={viewTab === 'structure' ? 'active' : ''}
              onClick={() => setViewTab('structure')}
            >
              Structure
            </button>
          </div>

        </div>
      </header>

      <main className="main">
        {viewTab === 'map' && (
          <div className="viz-container">
            <LayeredGraph
              data={flatFiles}
              onNodeClick={handleNodeClick}
            />
          </div>
        )}

        {viewTab === 'structure' && (
          <div className="structure-container">
            <StructureTree
              tree={data.tree}
              onNodeClick={handleNodeClick}
              projectSummary={data.projectSummary}
            />
          </div>
        )}

        {selectedNode && (
          <aside className="details-panel">
            <button className="close-btn" onClick={() => setSelectedNode(null)}>×</button>
            <div className="panel-header">
              <span className="file-ext">
                {selectedNode.extension?.replace('.', '').toUpperCase() || 'FILE'}
              </span>
              <h2>{selectedNode.baseName || selectedNode.id || selectedNode.name}</h2>
              <span
                className="layer-tag"
              >
                {selectedNode.layer}
              </span>
            </div>

            <div className="panel-content">
              <div className="panel-section">
                <h4>Summary</h4>
                <p>{selectedNode.summary || 'No summary available'}</p>
              </div>

              {selectedNode.keywords?.length > 0 && (
                <div className="panel-section">
                  <h4>Keywords</h4>
                  <div className="keyword-tags">
                    {selectedNode.keywords.map(kw => (
                      <span key={kw} className="keyword-tag">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="panel-section">
                <h4>Complexity</h4>
                <div className="complexity-bar">
                  <div
                    className="complexity-fill"
                    style={{
                      width: `${Math.min(selectedNode.complexity || 10, 100)}%`,
                      background: (selectedNode.complexity || 10) > 50 ? '#ff6b6b' :
                        (selectedNode.complexity || 10) > 25 ? '#ffd93d' : '#6bcb77'
                    }}
                  />
                  <span>{selectedNode.complexity || 10}</span>
                </div>
              </div>

              <div className="panel-section">
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

              <div className="panel-section">
                <h4>Used By</h4>
                {selectedNode.dependents?.length > 0 ? (
                  <ul className="dep-list">
                    {selectedNode.dependents.map(dep => (
                      <li key={dep} className="dep-item dependents">↑ {dep}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-deps">Not imported by other files</p>
                )}
              </div>
            </div>
          </aside>
        )}
      </main>

    </div>
  );
}

export default App;
