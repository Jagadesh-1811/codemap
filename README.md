#  CodeMap Neural Engine

<p align="center">
  <strong>AI-powered codebase visualization for VS Code</strong><br>
  Transform your code into interactive visual maps with Gemini AI summaries
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-1.85+-blue?logo=visual-studio-code" alt="VS Code Version" />
  <img src="https://img.shields.io/badge/D3.js-v7-orange?logo=d3.js" alt="D3.js" />
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

##  Overview

**CodeMap Neural Engine** is a Visual Studio Code extension that analyzes your entire codebase and generates beautiful, interactive visualizations. It uses Google's Gemini AI to understand your code and create intelligent summaries, helping you and your team quickly understand project architecture.

###  Key Features

- **Interactive Architecture Map** - Visualize files as nodes organized by architectural layers
-  **AI-Powered Summaries** - Gemini AI generates descriptions, keywords, and complexity scores
-  **Dependency Visualization** - See how files connect with arrows showing imports/dependencies
-  **Multi-Layer Organization** - Files auto-categorized into Frontend, Router, Backend, Database, Configuration, Utility
-  **Structure Tree View** - Hierarchical view of your project structure
-  **Beautiful Dark Theme** - Modern, eye-friendly design with color-coded layers

---

## 🚀 Installation

### From VSIX (Local)

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Install from VSIX"
4. Select `codemap-neural-engine-0.1.5.vsix`


# Package the extension
npx vsce package --allow-missing-repository --allow-star-activation

# Install in VS Code
code --install-extension codemap-neural-engine-0.1.6.vsix
```

---

## 📋 Usage

### Quick Start

1. **Open a project** in VS Code
2. **Click the CodeMap button** in the status bar (bottom)
3. **Wait for analysis** - The extension scans your files
4. **Explore the map** - Click nodes for details, hover for connections

### Commands

| Command | Description |
|---------|-------------|
| `CodeMap: Start` | Open the visualization panel |
| `CodeMap: Analyze Workspace` | Re-analyze the current workspace |
| `CodeMap: Set Gemini API Key` | Configure AI summaries |

### Setting Up AI Summaries (Optional)

1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Run command: `CodeMap: Set Gemini API Key.`
3. Paste your API key
4. Re-analyze your workspace for AI-enhanced summaries

---

## 🛠️ Tech Stack

### Extension Core
| Technology | Purpose |
|------------|---------|
| **Node.js** | Extension runtime |
| **VS Code API** | Editor integration |
| **@google/generative-ai** | Gemini AI for summaries |
| **@babel/parser** | JavaScript/TypeScript parsing |
| **@babel/traverse** | AST analysis for dependencies |
| **D3.js v7** | Data visualization |

### Development Webview
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Vite 7** | Build tool |
| **ESLint** | Code linting |

---

## 📁 Project Structure

```
codemap/
├── 📁 extension/                 # VS Code Extension
│   ├── 📁 src/
│   │   ├── extension.js         # Main entry point
│   │   ├── analyzer.js          # File parsing & analysis
│   │   ├── gemini.js            # AI integration
│   │   └── webview.js           # HTML/D3 visualization
│   ├── 📁 lib/
│   │   └── d3.min.js            # Bundled D3 library
│   ├── package.json
│   └── icon.png
│
├── 📁 webview/                   # React Development App
│   ├── 📁 src/
│   │   ├── App.jsx
│   │   └── 📁 components/
│   │       ├── ForceGraph.jsx
│   │       ├── LayeredGraph.jsx
│   │       └── StructureTree.jsx
│   ├── package.json
│   └── vite.config.js
│
├── knowledge-map.json            # Generated analysis data
└── README.md
```

---

## 🎨 Layer Classification

Files are automatically categorized into architectural layers:

| Layer | Color | File Types |
|-------|-------|------------|
| 🔵 **Frontend** | Cyan | React components, CSS, HTML |
| 🔴 **Router** | Red | Route handlers, navigation |
| 🟢 **Backend** | Green | APIs, services, controllers |
| 🟡 **Database** | Yellow | Models, schemas, migrations |
| 🟠 **Configuration** | Orange | Config files, env, package.json |
| 🟣 **Utility** | Purple | Helpers, utils, shared code |

---

## 🔍 Supported File Types

| Category | Extensions |
|----------|------------|
| **Code** | `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs` |
| **Styles** | `.css`, `.scss`, `.sass`, `.less` |
| **Markup** | `.html`, `.htm`, `.xml`, `.svg` |
| **Data** | `.json`, `.yaml`, `.yml`, `.toml`, `.env` |
| **Backend** | `.py`, `.rb`, `.php`, `.java`, `.go`, `.rs` |
| **Docs** | `.md`, `.mdx`, `.txt`, `.rst` |

---

## ⚙️ Configuration

Access settings via `File > Preferences > Settings > CodeMap Neural Engine`

| Setting | Default | Description |
|---------|---------|-------------|
| `codemap.geminiApiKey` | `""` | Your Gemini API key |
| `codemap.enableAI` | `true` | Enable AI summaries |

---

## 🔧 Development

### Prerequisites

- Node.js 18+
- VS Code 1.85+
- npm or yarn



### Build

```bash
cd extension
npx vsce package --allow-missing-repository --allow-star-activation
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](extension/LICENSE) file for details.

---

## 🙏 Acknowledgments

- [D3.js](https://d3js.org/) - Powerful visualization library
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI-powered code understanding
- [VS Code Extension API](https://code.visualstudio.com/api) - Extension framework

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Jagadesh-1811">Jagadesh</a>
</p>

<p align="center">
  <a href="https://github.com/Jagadesh-1811/codemap">⭐ Star this repo if you find it useful!</a>

</p>

