const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
    // Initialize Gemini with secret storage
    const { setSecretStorage, saveApiKey, isConfigured } = require('./gemini');
    setSecretStorage(context.secrets);

    // STATUS BAR BUTTON - IMMEDIATELY (Right side, highly visible)
    const btn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
    btn.text = "$(code) CodeMap";
    btn.command = "codemap.start";
    btn.tooltip = "Click to analyze codebase and visualize";
    btn.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    btn.show();
    context.subscriptions.push(btn);

    // Command to set Gemini API Key
    context.subscriptions.push(
        vscode.commands.registerCommand('codemap.setApiKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Gemini API Key',
                placeHolder: 'AIza...',
                password: true,
                ignoreFocusOut: true
            });

            if (apiKey) {
                const saved = await saveApiKey(apiKey);
                if (saved) {
                    vscode.window.showInformationMessage('✅ Gemini API Key saved! AI summaries are now enabled.');
                } else {
                    vscode.window.showErrorMessage('Failed to save API key.');
                }
            }
        })
    );

    // Simple start command
    context.subscriptions.push(
        vscode.commands.registerCommand('codemap.start', async () => {
            const folders = vscode.workspace.workspaceFolders;
            if (!folders) {
                vscode.window.showErrorMessage('Open a folder first!');
                return;
            }

            // Check if AI is configured
            const aiConfigured = await isConfigured();
            const config = vscode.workspace.getConfiguration('codemap');
            const useAI = config.get('enableAI') && aiConfigured;

            if (useAI) {
                vscode.window.showInformationMessage('CodeMap: Starting analysis with AI summaries...');
            } else {
                // Offer to set up API key
                const action = await vscode.window.showInformationMessage(
                    'CodeMap: AI summaries disabled. Set up Gemini API key for enhanced analysis?',
                    'Set API Key',
                    'Continue without AI'
                );
                
                if (action === 'Set API Key') {
                    await vscode.commands.executeCommand('codemap.setApiKey');
                    return; // User can re-run after setting key
                }
                
                vscode.window.showInformationMessage('CodeMap: Starting analysis...');
            }

            try {
                const { analyzeWorkspace } = require('./analyzer');
                const { getWebviewContent } = require('./webview');

                const result = await analyzeWorkspace(folders[0].uri.fsPath, () => { });

                // Save analysis data to project folder
                const dataPath = path.join(folders[0].uri.fsPath, 'knowledge-map.json');
                fs.writeFileSync(dataPath, JSON.stringify(result, null, 2));

                const aiCount = result.stats.aiAnalyzed || 0;
                if (aiCount > 0) {
                    vscode.window.showInformationMessage(`CodeMap: Done! ${result.stats.totalFiles} files analyzed, ${aiCount} with AI.`);
                } else {
                    vscode.window.showInformationMessage(`CodeMap: Done! ${result.stats.totalFiles} files analyzed.`);
                }

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
                console.error(e);
            }
        })
    );
}

function deactivate() { }
module.exports = { activate, deactivate };

