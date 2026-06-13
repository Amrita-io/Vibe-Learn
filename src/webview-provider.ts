import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class VibeLearnWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vibe-learn.dashboardView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Setup message listener
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'ready': {
          this.syncStateToWebview();
          break;
        }
        case 'saveState': {
          await vscode.commands.executeCommand('vibe-learn.internalSaveState', data.state);
          this.saveWorkspaceProgressFile(data.state);
          break;
        }
        case 'getWorkspacePath': {
          const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
          webviewView.webview.postMessage({
            type: 'workspacePath',
            path: workspacePath
          });
          break;
        }
        case 'openFile': {
          if (data.filePath) {
            const uri = vscode.Uri.file(data.filePath);
            vscode.workspace.openTextDocument(uri).then((doc) => {
              vscode.window.showTextDocument(doc);
            });
          }
          break;
        }
        case 'showError': {
          vscode.window.showErrorMessage(`Vibe Learn: ${data.message}`);
          break;
        }
        case 'showInfo': {
          vscode.window.showInformationMessage(`Vibe Learn: ${data.message}`);
          break;
        }
      }
    });
  }

  public syncStateToWebview() {
    if (!this._view) {
      return;
    }
    const state = vscode.workspace.getConfiguration('vibe-learn').get('playerState') || null;
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this._view.webview.postMessage({
      type: 'loadState',
      state: state,
      workspacePath: workspacePath
    });
  }

  public postCommand(command: string, payload: any) {
    if (!this._view) {
      return;
    }
    this._view.show(true); // Bring panel to focus
    this._view.webview.postMessage({
      type: 'command',
      command: command,
      payload: payload
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Determine the paths to compiled assets
    const webviewUiPath = path.join(this._extensionUri.fsPath, 'webview-ui', 'dist');
    const indexHtmlPath = path.join(webviewUiPath, 'index.html');

    if (fs.existsSync(indexHtmlPath)) {
      // Read built HTML from Vite and patch resource paths for VS Code webview sandbox
      let html = fs.readFileSync(indexHtmlPath, 'utf8');
      
      // Replace asset links src="/assets/..." with webview URIs
      html = html.replace(
        /(href|src)="\/assets\/([^"]+)"/g,
        (match, attribute, assetName) => {
          const fileUri = vscode.Uri.file(path.join(webviewUiPath, 'assets', assetName));
          const webviewUri = webview.asWebviewUri(fileUri);
          return `${attribute}="${webviewUri}"`;
        }
      );
      return html;
    }

    // Fallback template for development mode before UI is built
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vibe Learn</title>
        <style>
          body {
            font-family: sans-serif;
            padding: 20px;
            color: #7A7890;
            background-color: #0D0D0F;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
          }
          h2 { color: #F0EEF8; }
          .loader {
            border: 4px solid #141418;
            border-top: 4px solid #7C6DFA;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="loader"></div>
        <h2>Initializing Vibe Learn Engine...</h2>
        <p>Please compile the webview assets using <code>npm run build-all</code></p>
      </body>
      </html>`;
  }

  private saveWorkspaceProgressFile(state: any) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return;
    }
    const vibeDir = path.join(workspaceRoot, '.vibe-learn');
    const filepath = path.join(vibeDir, 'progress.json');

    try {
      if (!fs.existsSync(vibeDir)) {
        fs.mkdirSync(vibeDir, { recursive: true });
      }

      const features = Object.values(state.features || {}) as any[];
      let arch = 0, sys = 0, file = 0, fn = 0, syn = 0, eng = 0, concepts = 0, overall = 0;
      const completedMissions: string[] = [];
      const completedTasks: string[] = [];

      if (features.length > 0) {
        features.forEach(f => {
          arch += f.understandingScore?.architecture || 0;
          sys += f.understandingScore?.system_logic || 0;
          file += f.understandingScore?.file_logic || 0;
          fn += f.understandingScore?.function_logic || 0;
          syn += f.understandingScore?.syntax || 0;
          eng += f.understandingScore?.engineering_decisions || 0;
          concepts += f.understandingScore?.concepts || 0;
          overall += f.understandingScore?.overall || 0;

          f.missions?.forEach((m: any) => {
            if (m.status === 'completed') {
              completedMissions.push(m.id);
            }
            m.tasks?.forEach((t: any) => {
              if (t.isCompleted) {
                completedTasks.push(t.id);
              }
            });
          });
        });

        const len = features.length;
        arch = Math.round(arch / len);
        sys = Math.round(sys / len);
        file = Math.round(file / len);
        fn = Math.round(fn / len);
        syn = Math.round(syn / len);
        eng = Math.round(eng / len);
        concepts = Math.round(concepts / len);
        overall = Math.round(overall / len);
      }

      const conceptStatuses: Record<string, string> = {};
      const conceptMasteryScores: Record<string, number> = {};
      state.concept_graph?.nodes?.forEach((node: any) => {
        conceptStatuses[node.id] = node.status;
        conceptMasteryScores[node.id] = node.mastery_score;
        node.tasks?.forEach((t: any) => {
          if (t.isCompleted) {
            completedTasks.push(t.id);
          }
        });
      });

      const progressData = {
        workspace: path.basename(workspaceRoot),
        last_analyzed: new Date().toISOString(),
        understanding_score: {
          architecture: arch,
          system_logic: sys,
          file_logic: file,
          function_logic: fn,
          syntax: syn,
          engineering_decisions: eng,
          concepts: concepts,
          overall: overall
        },
        xp: state.xp || 0,
        level: state.level || 1,
        streak: state.streakData || {
          current_streak: state.streak || 0,
          longest_streak: state.streak || 0,
          last_active_date: state.lastActiveDate || '',
          total_missions_completed: completedMissions.length,
          total_xp_earned: state.xp || 0,
          daily_goal: 3,
          daily_completed_today: 0
        },
        completed_missions: completedMissions,
        completed_tasks: completedTasks,
        concept_statuses: conceptStatuses,
        concept_mastery_scores: conceptMasteryScores
      };

      fs.writeFileSync(filepath, JSON.stringify(progressData, null, 2), 'utf8');
      console.log('Saved workspace progress to disk successfully.');
    } catch (err) {
      console.error('Failed to write progress.json workspace file:', err);
    }
  }
}
