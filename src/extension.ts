import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VibeLearnWebviewProvider } from './webview-provider';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log('Vibe Learn Extension is now active!');

  const provider = new VibeLearnWebviewProvider(context.extensionUri);

  // Register Sidebar Webview View
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      VibeLearnWebviewProvider.viewType,
      provider
    )
  );

  // Register Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'vibe-learn.startMission';
  context.subscriptions.push(statusBarItem);

  // Load initial status bar
  updateStatusBar();

  // Internal Command to save state from Webview to globalState
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe-learn.internalSaveState', async (state: any) => {
      // Save state to GlobalState
      await context.globalState.update('vibe_learn_player_profile', state);
      
      // Also write to extension settings workspace config for redundancy and readability
      const config = vscode.workspace.getConfiguration('vibe-learn');
      await config.update('playerState', state, vscode.ConfigurationTarget.Global);
      
      // Update Status Bar
      updateStatusBar(state);
    })
  );

  // Command: Analyze Workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe-learn.analyze', () => {
      provider.postCommand('analyzeWorkspace', {});
      vscode.window.showInformationMessage('Vibe Learn: Analyzing codebase structure...');
    })
  );

  // Command: Start Next Mission
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe-learn.startMission', () => {
      provider.postCommand('startNextMission', {});
    })
  );

  // Command: Explain File (Context Menu)
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe-learn.explainFile', (uri: vscode.Uri) => {
      let filePath = '';
      if (uri) {
        filePath = uri.fsPath;
      } else if (vscode.window.activeTextEditor) {
        filePath = vscode.window.activeTextEditor.document.uri.fsPath;
      }

      if (filePath) {
        provider.postCommand('explainFile', { filePath });
      } else {
        vscode.window.showWarningMessage('Vibe Learn: No active file found to explain.');
      }
    })
  );

  // Command: Explain Function (Context Menu with Selection)
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe-learn.explainFunction', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        const filePath = editor.document.uri.fsPath;
        if (text) {
          provider.postCommand('explainFunction', { filePath, functionName: text });
        } else {
          vscode.window.showWarningMessage('Vibe Learn: Please highlight a function name in the editor first.');
        }
      } else {
        vscode.window.showWarningMessage('Vibe Learn: Open an editor and select a function first.');
      }
    })
  );

  // Command: Export Progress Report
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe-learn.exportReport', async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('Vibe Learn: No active workspace found to export progress report.');
        return;
      }

      const config = vscode.workspace.getConfiguration('vibe-learn');
      let state = config.get('playerState') as any;

      if (!state) {
        const progressFile = path.join(workspaceRoot, '.vibe-learn', 'progress.json');
        if (fs.existsSync(progressFile)) {
          try {
            state = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
          } catch (e) {}
        }
      }

      if (!state || !state.features) {
        vscode.window.showErrorMessage('Vibe Learn: Please perform workspace analysis first before exporting a report.');
        return;
      }

      const getLevelTitle = (lvl: number) => {
        if (lvl === 1) return "Junior Inspector";
        if (lvl === 2) return "System Investigator";
        if (lvl === 3) return "Senior Analyst";
        if (lvl === 4) return "Lead Architect";
        return "Master Engineer";
      };

      const features = Object.values(state.features) as any[];
      let archScore = 0, sysScore = 0, fileScore = 0, fnScore = 0, synScore = 0, engScore = 0;
      let archDone = 0, archTotal = 0;
      let sysDone = 0, sysTotal = 0;
      let fileDone = 0, fileTotal = 0;
      let fnDone = 0, fnTotal = 0;
      let synDone = 0, synTotal = 0;
      let engDone = 0, engTotal = 0;

      features.forEach(f => {
        const s = f.understandingScore || {};
        archScore += s.architecture || 0;
        sysScore += s.system_logic || 0;
        fileScore += s.file_logic || 0;
        fnScore += s.function_logic || 0;
        synScore += s.syntax || 0;
        engScore += s.engineering_decisions || 0;

        f.missions?.forEach((m: any) => {
          const isDone = m.status === 'completed';
          if (m.pillar === 'architecture') { archTotal++; if (isDone) archDone++; }
          else if (m.pillar === 'system_logic') { sysTotal++; if (isDone) sysDone++; }
          else if (m.pillar === 'file_logic') { fileTotal++; if (isDone) fileDone++; }
          else if (m.pillar === 'function_logic') { fnTotal++; if (isDone) fnDone++; }
          else if (m.pillar === 'syntax') { synTotal++; if (isDone) synDone++; }
          else if (m.pillar === 'engineering_decisions') { engTotal++; if (isDone) engDone++; }
        });
      });

      const len = features.length || 1;
      const avgArch = Math.round(archScore / len);
      const avgSys = Math.round(sysScore / len);
      const avgFile = Math.round(fileScore / len);
      const avgFn = Math.round(fnScore / len);
      const avgSyn = Math.round(synScore / len);
      const avgEng = Math.round(engScore / len);
      
      const conceptNodes = state.concept_graph?.nodes || [];
      const totalConcepts = conceptNodes.length || 1;
      const completedConcepts = conceptNodes.filter((n: any) => n.status === 'completed').length;
      const avgConcepts = Math.round((completedConcepts / totalConcepts) * 100);

      const overallScore = Math.round(
        (avgArch * 0.20) + (avgSys * 0.15) + (avgFile * 0.15) + (avgFn * 0.10) + (avgSyn * 0.10) + (avgEng * 0.15) + (avgConcepts * 0.15)
      );

      const masteredConcepts = conceptNodes.filter((n: any) => n.status === 'completed').map((n: any) => `- ${n.name} ✓`);
      const lockedConcepts = conceptNodes.filter((n: any) => n.status === 'locked').map((n: any) => {
        const missing = n.prerequisites.filter((p: string) => {
          const prereqNode = conceptNodes.find((cn: any) => cn.id === p);
          return prereqNode && prereqNode.status !== 'completed';
        }).map((p: string) => p.replace('cn_', ''));
        return `- ${n.name} (requires: ${missing.join(', ') || 'preceding nodes'})`;
      });

      const pillarScores = [
        { name: "Architecture", score: avgArch, desc: "understanding module boundaries" },
        { name: "System Logic", score: avgSys, desc: "tracing end-to-end workflows" },
        { name: "File Logic", score: avgFile, desc: "diagnosing imports and file dependencies" },
        { name: "Function Logic", score: avgFn, desc: "reconstructing internal functions logic" },
        { name: "Syntax", score: avgSyn, desc: "analyzing language keywords and library callbacks" },
        { name: "Engineering Decisions", score: avgEng, desc: "evaluating stack choices and tradeoffs" },
        { name: "Concepts", score: avgConcepts, desc: "mastering knowledge trees" }
      ];
      const sortedPillars = [...pillarScores].sort((a, b) => a.score - b.score);
      const weakest1 = sortedPillars[0];
      const weakest2 = sortedPillars[1];

      const recommendations: string[] = [];
      for (const p of sortedPillars) {
        let found = false;
        for (const f of features) {
          const nextM = f.missions?.find((m: any) => m.pillar === p.name.toLowerCase().replace(' ', '_') && m.status !== 'completed');
          if (nextM) {
            recommendations.push(`${p.name}: ${nextM.title}`);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      
      const nextAvailableConcept = conceptNodes.find((n: any) => n.status === 'available');
      if (nextAvailableConcept) {
        recommendations.push(`Concept: ${nextAvailableConcept.name} (unlocks downstream nodes)`);
      }

      if (recommendations.length === 0) {
        recommendations.push("Congratulations! All generated missions completed. Add more code to expand your training.");
      }

      const reportContent = `# Vibe Learn — Understanding Report
Generated: ${new Date().toLocaleDateString()}
Workspace: ${path.basename(workspaceRoot)}

## Overall Understanding: ${overallScore}%
Level ${state.level || 1} — ${getLevelTitle(state.level || 1)} | Total XP: ${state.xp || 0} | Streak: ${state.streak || 0} days

## Pillar Breakdown
| Pillar              | Score | Missions Done |
|---------------------|-------|---------------|
| Architecture        | ${avgArch}%   | ${archDone}/${archTotal}           |
| System Logic        | ${avgSys}%   | ${sysDone}/${sysTotal}           |
| File Logic          | ${avgFile}%   | ${fileDone}/${fileTotal}           |
| Function Logic      | ${avgFn}%   | ${fnDone}/${fnTotal}           |
| Syntax              | ${avgSyn}%   | ${synDone}/${synTotal}           |
| Engineering         | ${avgEng}%   | ${engDone}/${engTotal}           |
| Concepts            | ${avgConcepts}%   | ${completedConcepts}/${totalConcepts}          |

## Completed Concepts
${masteredConcepts.length > 0 ? masteredConcepts.join('\n') : "None yet. Master prerequisite nodes to begin."}

## Locked Concepts (prerequisites incomplete)
${lockedConcepts.length > 0 ? lockedConcepts.join('\n') : "All concepts unlocked!"}

## Weakest Areas
1. ${weakest1.name} — ${weakest1.score}% (focus: ${weakest1.desc})
2. ${weakest2.name} — ${weakest2.score}% (focus: ${weakest2.desc})

## Recommended Next Missions
${recommendations.map((r, idx) => `${idx + 1}. ${r}`).join('\n')}
`;

      const reportPath = path.join(workspaceRoot, 'vibe-learn-report.md');
      fs.writeFileSync(reportPath, reportContent, 'utf8');
      
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(reportPath));
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage('Vibe Learn: Understanding Report exported successfully to vibe-learn-report.md!');
    })
  );
}

function updateStatusBar(playerState?: any) {
  if (!statusBarItem) {
    return;
  }

  // Load from workspace configuration if not explicitly provided
  if (!playerState) {
    const config = vscode.workspace.getConfiguration('vibe-learn');
    playerState = config.get('playerState');
  }

  if (playerState && playerState.features) {
    const features = Object.values(playerState.features) as any[];
    if (features.length > 0) {
      let totalScore = 0;
      features.forEach((f) => {
        totalScore += f.understandingScore?.overall || f.understandingScore?.architecture || 0;
      });
      const avgScore = Math.round(totalScore / features.length);
      statusBarItem.text = `$(shield) Vibe Learn: ${avgScore}%`;
      statusBarItem.tooltip = `Vibe Learn: Level ${playerState.level || 1} | Overall Understanding: ${avgScore}%`;
      statusBarItem.show();
      return;
    }
  }

  statusBarItem.text = `$(shield) Vibe Learn: 0%`;
  statusBarItem.tooltip = `Vibe Learn: No features analyzed yet. Click to start.`;
  statusBarItem.show();
}

export function deactivate() {}
