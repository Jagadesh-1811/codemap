const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
    // STATUS BAR BUTTON - IMMEDIATELY (Right side, highly visible)
    const btn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    btn.text = "$(code) CodeMap";
    btn.command = "codemap.start";
    btn.tooltip = "Click to analyze codebase and visualize";
    btn.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    btn.show();
    context.subscriptions.push(btn);

    // Simple start command
    context.subscriptions.push(
        vscode.commands.registerCommand('codemap.start', async () => {
            vscode.window.showInformationMessage('CodeMap: Starting analysis...');

            const folders = vscode.workspace.workspaceFolders;
            if (!folders) {
                vscode.window.showErrorMessage('Open a folder first!');
                return;
            }

            try {
                const { analyzeWorkspace } = require('./analyzer');
                const { getWebviewContent } = require('./webview');

                const result = await analyzeWorkspace(folders[0].uri.fsPath, () => { });

                // Save analysis data to project folder
                const dataPath = path.join(folders[0].uri.fsPath, 'knowledge-map.json');
                fs.writeFileSync(dataPath, JSON.stringify(result, null, 2));

                vscode.window.showInformationMessage('CodeMap: Done! ' + result.stats.totalFiles + ' files analyzed.');

                // Create and show webview panel in VS Code
                const panel = vscode.window.createWebviewPanel(
                    'codemapView',
                    'CodeMap Neural Engine',
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true,
                        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'lib'))]
                    }
                );

                // Get D3 URI
                const d3Uri = panel.webview.asWebviewUri(
                    vscode.Uri.file(path.join(context.extensionPath, 'lib', 'd3.min.js'))
                );

                // Set the webview content
                panel.webview.html = getWebviewContent(result, panel.webview, d3Uri);

            } catch (e) {
                vscode.window.showErrorMessage('Error: ' + e.message);
            }
        })
    );
}

function deactivate() { }
module.exports = { activate, deactivate };

