import React, { useState, useEffect } from 'react';
import { PlayerState, Feature, Mission, MissionTask } from './types';
import RPGDashboard from './components/RPGDashboard';
import MissionControl from './components/MissionControl';
import Onboarding from './components/Onboarding';
import LoadingSkeleton from './components/LoadingSkeleton';
import { getLevelInfo } from './xp_system';

// Access the VS Code extension API
let vscode: any = null;
try {
  vscode = window.acquireVsCodeApi();
} catch (e) {
  // Fallback for local browser development/preview
  console.warn('VS Code API not found, running in browser preview mode.');
}

const DEFAULT_STATE: PlayerState = {
  level: 1,
  xp: 0,
  xpNeeded: 300, // Matching level 2 required XP boundary from levels list
  streak: 0,
  lastActiveDate: null,
  features: {},
  onboarded: false
};

export default function App() {
  const [state, setState] = useState<PlayerState>(DEFAULT_STATE);
  const [workspacePath, setWorkspacePath] = useState<string>('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'mission' | 'concepts'>('dashboard');
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [apiMode, setApiMode] = useState<string>('Offline');
  const [floatingXp, setFloatingXp] = useState<{ amount: number; id: number }[]>([]);
  const [unlockedPulseIds, setUnlockedPulseIds] = useState<string[]>([]);

  const checkStreakOnLoad = (currentState: PlayerState): PlayerState => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    let updated = false;
    let currentStreak = currentState.streak || 0;
    let streakData = currentState.streakData || {
      current_streak: currentStreak,
      longest_streak: currentStreak,
      last_active_date: currentState.lastActiveDate || '',
      total_missions_completed: 0,
      total_xp_earned: currentState.xp || 0,
      daily_goal: 3,
      daily_completed_today: 0
    };

    const lastDate = streakData.last_active_date || currentState.lastActiveDate;

    if (lastDate !== today) {
      if (lastDate === yesterday) {
        // Was yesterday. Did they complete at least 1 mission yesterday?
        if (streakData.daily_completed_today < 1) {
          // Reset streak
          currentStreak = 0;
          streakData.current_streak = 0;
          streakData.daily_completed_today = 0;
          updated = true;
        } else {
          // Keep streak, but reset today's completions for the new day
          streakData.daily_completed_today = 0;
          updated = true;
        }
      } else if (lastDate) {
        // Older than yesterday. Reset streak
        currentStreak = 0;
        streakData.current_streak = 0;
        streakData.daily_completed_today = 0;
        updated = true;
      }
      streakData.last_active_date = today;
      updated = true;
    }

    if (updated) {
      return {
        ...currentState,
        streak: currentStreak,
        lastActiveDate: today,
        streakData: {
          ...streakData,
          current_streak: currentStreak,
          last_active_date: today
        }
      };
    }
    return currentState;
  };

  // Notify extension we are ready to receive initial loaded state
  useEffect(() => {
    if (vscode) {
      vscode.postMessage({ type: 'ready' });
    } else {
      // Mock some workspace data for testing outside of VS Code
      setWorkspacePath('/mock/workspace/vibe-learn-demo');
    }
  }, []);

  // Check health and mode of backend
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(res => res.json())
      .then(data => {
        if (data.mode) {
          setApiMode(data.mode);
        }
      })
      .catch(() => {
        setApiMode('Offline Server Unavailable');
      });
  }, [isAnalyzing]);

  // Handle messages sent from the extension host
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'loadState': {
          if (message.state) {
            const checkedState = checkStreakOnLoad(message.state);
            setState(checkedState);
            if (JSON.stringify(checkedState) !== JSON.stringify(message.state)) {
              if (vscode) {
                vscode.postMessage({
                  type: 'saveState',
                  state: checkedState
                });
              }
            }
          }
          if (message.workspacePath) {
            setWorkspacePath(message.workspacePath);
          }
          break;
        }
        case 'workspacePath': {
          if (message.path) {
            setWorkspacePath(message.path);
          }
          break;
        }
        case 'command': {
          if (message.command === 'analyzeWorkspace') {
            triggerAnalysis(message.payload?.path || workspacePath);
          } else if (message.command === 'startNextMission') {
            startFirstAvailableMission(message.payload?.state || state);
          } else if (message.command === 'explainFile') {
            handleContextExplain(message.payload?.filePath, 'file');
          } else if (message.command === 'explainFunction') {
            handleContextExplain(message.payload?.filePath, 'function', message.payload?.functionName);
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [state, workspacePath]);

  // Sync state changes to VS Code persistence layer
  const saveState = (newState: PlayerState) => {
    setState(newState);
    if (vscode) {
      vscode.postMessage({
        type: 'saveState',
        state: newState
      });
    }
  };

  const triggerAnalysis = async (pathTarget: string) => {
    const scanPath = pathTarget || workspacePath;
    if (!scanPath) {
      if (vscode) {
        vscode.postMessage({ type: 'showError', message: 'No active workspace open to analyze.' });
      }
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_path: scanPath })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      // Update features in profile but retain already earned scores if they existed
      const mergedFeatures = { ...state.features };
      Object.keys(data.features).forEach((fid) => {
        const newFeat: Feature = data.features[fid];
        if (mergedFeatures[fid]) {
          // Keep scores
          newFeat.understandingScore = mergedFeatures[fid].understandingScore;
          // Retain mission completions
          newFeat.missions = newFeat.missions.map(m => {
            const oldMission = mergedFeatures[fid].missions.find(om => om.id === m.id);
            if (oldMission) {
              return { ...m, status: oldMission.status, tasks: m.tasks.map(t => {
                const oldTask = oldMission.tasks.find(ot => ot.id === t.id);
                return oldTask ? { ...t, isCompleted: oldTask.isCompleted } : t;
              })};
            }
            return m;
          });
        }
        mergedFeatures[fid] = newFeat;
      });

      const newState = {
        ...state,
        features: mergedFeatures,
        concept_graph: data.concept_graph
      };

      saveState(newState);
      
      if (vscode) {
        vscode.postMessage({ type: 'showInfo', message: 'Workspace architecture analysis complete!' });
      }
      
      // Select first feature automatically if none active
      const firstFid = Object.keys(mergedFeatures)[0];
      if (firstFid) {
        setActiveFeatureId(firstFid);
      }
    } catch (err: any) {
      console.error(err);
      if (vscode) {
        vscode.postMessage({ type: 'showError', message: `Analysis failed: ${err.message}` });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startFirstAvailableMission = (currentState: PlayerState) => {
    // Find the first active/locked mission in any feature
    const features = Object.values(currentState.features);
    for (const f of features) {
      const nextMission = f.missions.find(m => m.status === 'active' || m.status === 'locked');
      if (nextMission) {
        setActiveFeatureId(f.id);
        setActiveMissionId(nextMission.id);
        setCurrentView('mission');
        return;
      }
    }
    if (vscode) {
      vscode.postMessage({ type: 'showInfo', message: 'All missions completed! Create more features to progress.' });
    }
  };

  const handleContextExplain = (filePath: string, contextType: 'file' | 'function', details?: string) => {
    // Locate if this file belongs to any feature
    const features = Object.values(state.features);
    const matchedFeature = features.find(f => 
      f.missions.some(m => 
        m.tasks.some(t => 
          (t.content.matchingItems?.some(mi => mi.name === filePath)) ||
          (t.content.boundaryItems?.some(bi => bi.name === filePath)) ||
          (t.content.flowSteps?.some(fs => fs.component === filePath))
        )
      )
    );

    if (matchedFeature) {
      setActiveFeatureId(matchedFeature.id);
      setCurrentView('dashboard');
      if (vscode) {
        vscode.postMessage({ 
          type: 'showInfo', 
          message: `Located file context under: ${matchedFeature.name}`
        });
      }
    } else {
      if (vscode) {
        vscode.postMessage({ 
          type: 'showWarningMessage', 
          message: `Context file is not mapped to an active feature. Scan workspace first.` 
        });
      }
    }
  };

  const submitTaskEvaluation = async (
    featureId: string,
    missionId: string,
    taskId: string,
    taskType: string,
    taskContent: any,
    submission: any
  ) => {
    try {
      const response = await fetch('http://localhost:8000/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_id: featureId,
          mission_id: missionId,
          task_id: taskId,
          task_type: taskType,
          task_content: taskContent,
          submission: submission
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const evalResult = await response.json();

      if (evalResult.isCorrect) {
        let unlockedNodes: string[] = [];
        if (featureId === "concepts") {
          // Calculate if this task completion will complete the concept node
          const conceptId = missionId;
          const node = state.concept_graph?.nodes.find(n => n.id === conceptId);
          if (node) {
            let newMastery = node.mastery_score;
            const task = node.tasks.find(t => t.id === taskId);
            if (task && !task.isCompleted) {
              if (task.type === 'concept-discovery') newMastery += 20;
              else if (task.type === 'concept-mcq') newMastery += 30;
              else if (task.type === 'concept-prereq-map') newMastery += 20;
              else if (task.type === 'concept-apply') newMastery += 15;
              else if (task.type === 'concept-reconstruction') newMastery += 15;
            }
            if (newMastery >= 80 && node.status !== 'completed') {
              try {
                const unlockRes = await fetch(`http://localhost:8000/concept/unlock?concept_id=${conceptId}&workspace_path=${encodeURIComponent(workspacePath)}`, {
                  method: 'POST'
                });
                if (unlockRes.ok) {
                  const unlockData = await unlockRes.json();
                  unlockedNodes = unlockData.unlocked || [];
                }
              } catch (e) {
                console.error("Backend concept unlock call failed", e);
              }
            }
          }
        }
        updateProgress(featureId, missionId, taskId, evalResult.xpGained, evalResult.scoreReward, unlockedNodes);
        return { isCorrect: true, feedback: evalResult.feedback };
      } else {
        // Task failed (might still gain some small XP for effort)
        updateXPOnly(evalResult.xpGained);
        return { isCorrect: false, feedback: evalResult.feedback };
      }
    } catch (err: any) {
      console.error(err);
      if (vscode) {
        vscode.postMessage({ type: 'showError', message: `Evaluation failed: ${err.message}` });
      }
      return { isCorrect: false, feedback: 'Server connection failed.' };
    }
  };

  const updateXPOnly = (xpGained: number) => {
    if (xpGained > 0) {
      const id = Date.now() + Math.random();
      setFloatingXp(prev => [...prev, { amount: xpGained, id }]);
      setTimeout(() => {
        setFloatingXp(prev => prev.filter(item => item.id !== id));
      }, 1500);
    }

    const newTotalXp = (state.xp || 0) + xpGained;
    const oldLevelInfo = getLevelInfo(state.xp || 0);
    const newLevelInfo = getLevelInfo(newTotalXp);
    const leveledUp = newLevelInfo.level > oldLevelInfo.level;

    const newState = {
      ...state,
      level: newLevelInfo.level,
      xp: newTotalXp,
      xpNeeded: newLevelInfo.xpNeededForNext
    };

    saveState(newState);

    if (leveledUp) {
      triggerLevelUpAlert(newLevelInfo.level);
    }
  };

  const updateProgress = (
    featureId: string,
    missionId: string,
    taskId: string,
    xpGained: number,
    scoreReward: number,
    unlockedNodes?: string[]
  ) => {
    // Trigger floating XP animation
    if (xpGained > 0) {
      const id = Date.now() + Math.random();
      setFloatingXp(prev => [...prev, { amount: xpGained, id }]);
      setTimeout(() => {
        setFloatingXp(prev => prev.filter(item => item.id !== id));
      }, 1500);
    }

    if (featureId === "concepts") {
      const graphCopy = { ...state.concept_graph } as any;
      if (graphCopy && graphCopy.nodes) {
        const node = graphCopy.nodes.find((n: any) => n.id === missionId);
        if (node) {
          const task = node.tasks.find((t: any) => t.id === taskId);
          if (task) {
            task.isCompleted = true;
          }
          // Recalculate mastery
          let mastery = 0;
          node.tasks.forEach((t: any) => {
            if (t.isCompleted) {
              if (t.type === 'concept-discovery') mastery += 20;
              else if (t.type === 'concept-mcq') mastery += 30;
              else if (t.type === 'concept-prereq-map') mastery += 20;
              else if (t.type === 'concept-apply') mastery += 15;
              else if (t.type === 'concept-reconstruction') mastery += 15;
            }
          });
          node.mastery_score = mastery;
          if (mastery >= 80) {
            node.status = 'completed';
          }

          // Update newly unlocked nodes status to available
          if (unlockedNodes && unlockedNodes.length > 0) {
            graphCopy.nodes.forEach((n: any) => {
              if (unlockedNodes.includes(n.id) && n.status === 'locked') {
                n.status = 'available';
              }
            });
          }
        }
      }

      // Recalculate global concepts score
      const totalNodes = graphCopy.nodes?.length || 1;
      const sumMastery = graphCopy.nodes?.reduce((sum: number, n: any) => sum + (n.mastery_score || 0), 0) || 0;
      const conceptsScore = Math.round(sumMastery / totalNodes);

      // Apply this concepts score to all features
      const featuresCopy = { ...state.features };
      Object.keys(featuresCopy).forEach(fid => {
        const f = featuresCopy[fid];
        f.understandingScore.concepts = conceptsScore;

        const arch = f.understandingScore.architecture || 0;
        const sys = f.understandingScore.system_logic || 0;
        const file = f.understandingScore.file_logic || 0;
        const fn = f.understandingScore.function_logic || 0;
        const syn = f.understandingScore.syntax || 0;
        const eng = f.understandingScore.engineering_decisions || 0;

        f.understandingScore.overall = Math.round(
          (arch * 0.20) + (sys * 0.15) + (file * 0.15) + (fn * 0.10) + (syn * 0.10) + (eng * 0.15) + (conceptsScore * 0.15)
        );
      });

      // Update XP/Levels using total cumulative XP
      const newTotalXp = (state.xp || 0) + xpGained;
      const oldLevelInfo = getLevelInfo(state.xp || 0);
      const newLevelInfo = getLevelInfo(newTotalXp);
      const leveledUp = newLevelInfo.level > oldLevelInfo.level;

      const newState = {
        ...state,
        level: newLevelInfo.level,
        xp: newTotalXp,
        xpNeeded: newLevelInfo.xpNeededForNext,
        concept_graph: graphCopy,
        features: featuresCopy
      };

      saveState(newState);

      if (leveledUp) {
        triggerLevelUpAlert(newLevelInfo.level);
      }

      if (unlockedNodes && unlockedNodes.length > 0) {
        setUnlockedPulseIds(unlockedNodes);
        setTimeout(() => {
          setUnlockedPulseIds([]);
        }, 5000);
      }
      return;
    }

    // Normal features/missions progress updates
    const featuresCopy = { ...state.features };
    const feature = featuresCopy[featureId];
    if (!feature) return;

    // 1. Mark task as completed
    const mission = feature.missions.find(m => m.id === missionId);
    if (!mission) return;

    const task = mission.tasks.find(t => t.id === taskId);
    if (task) {
      task.isCompleted = true;
    }

    // 2. Adjust understanding score based on pillar type
    if (mission.pillar === 'architecture') {
      feature.understandingScore.architecture = Math.min(100, (feature.understandingScore.architecture || 0) + scoreReward);
    } else if (mission.pillar === 'system_logic') {
      feature.understandingScore.system_logic = Math.min(100, (feature.understandingScore.system_logic || 0) + scoreReward);
    } else if (mission.pillar === 'file_logic') {
      feature.understandingScore.file_logic = Math.min(100, (feature.understandingScore.file_logic || 0) + scoreReward);
    } else if (mission.pillar === 'function_logic') {
      feature.understandingScore.function_logic = Math.min(100, (feature.understandingScore.function_logic || 0) + scoreReward);
    } else if (mission.pillar === 'syntax') {
      feature.understandingScore.syntax = Math.min(100, (feature.understandingScore.syntax || 0) + scoreReward);
    } else if (mission.pillar === 'engineering_decisions') {
      feature.understandingScore.engineering_decisions = Math.min(100, (feature.understandingScore.engineering_decisions || 0) + scoreReward);
    }
    
    // Recalculate weighted overall understanding
    const arch = feature.understandingScore.architecture || 0;
    const sys = feature.understandingScore.system_logic || 0;
    const file = feature.understandingScore.file_logic || 0;
    const fn = feature.understandingScore.function_logic || 0;
    const syn = feature.understandingScore.syntax || 0;
    const eng = feature.understandingScore.engineering_decisions || 0;
    const concepts = feature.understandingScore.concepts || 0;
    
    feature.understandingScore.overall = Math.round(
      (arch * 0.20) + (sys * 0.15) + (file * 0.15) + (fn * 0.10) + (syn * 0.10) + (eng * 0.15) + (concepts * 0.15)
    );

    // 3. Check if all tasks in mission are completed -> complete mission
    const allTasksCompleted = mission.tasks.every(t => t.isCompleted);
    let currentStreak = state.streak || 0;
    let streakData = state.streakData || {
      current_streak: currentStreak,
      longest_streak: currentStreak,
      last_active_date: new Date().toDateString(),
      total_missions_completed: 0,
      total_xp_earned: state.xp || 0,
      daily_goal: 3,
      daily_completed_today: 0
    };

    if (allTasksCompleted) {
      mission.status = 'completed';
      const nextMissionIndex = feature.missions.findIndex(m => m.id === missionId) + 1;
      if (nextMissionIndex < feature.missions.length) {
        feature.missions[nextMissionIndex].status = 'active';
      }

      // Completion-based Streak logic
      const today = new Date().toDateString();
      streakData.total_missions_completed += 1;
      streakData.daily_completed_today += 1;

      if (streakData.daily_completed_today === 1) {
        if (currentStreak > 0) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
        streakData.current_streak = currentStreak;
        if (currentStreak > streakData.longest_streak) {
          streakData.longest_streak = currentStreak;
        }
      }
      streakData.last_active_date = today;
    }

    // 4. Update XP/Levels using getLevelInfo
    const newTotalXp = (state.xp || 0) + xpGained;
    const oldLevelInfo = getLevelInfo(state.xp || 0);
    const newLevelInfo = getLevelInfo(newTotalXp);
    const leveledUp = newLevelInfo.level > oldLevelInfo.level;

    streakData.total_xp_earned = newTotalXp;

    const newState = {
      ...state,
      level: newLevelInfo.level,
      xp: newTotalXp,
      xpNeeded: newLevelInfo.xpNeededForNext,
      streak: currentStreak,
      lastActiveDate: streakData.last_active_date,
      features: featuresCopy,
      streakData: streakData
    };

    saveState(newState);

    if (leveledUp) {
      triggerLevelUpAlert(newLevelInfo.level);
    }
  };

  const triggerLevelUpAlert = (level: number) => {
    setLevelUpMessage(`LEVEL UP! You reached Level ${level}!`);
    setTimeout(() => {
      setLevelUpMessage(null);
    }, 4000);
  };

  const getActiveFeature = (): Feature | undefined => {
    return activeFeatureId ? state.features[activeFeatureId] : undefined;
  };

  const getActiveMission = (): Mission | undefined => {
    const f = getActiveFeature();
    return f ? f.missions.find(m => m.id === activeMissionId) : undefined;
  };

  const showOnboarding = !state.onboarded && Object.keys(state.features).length === 0;

  if (showOnboarding) {
    return (
      <Onboarding
        onStartScan={async () => {
          await triggerAnalysis(workspacePath);
        }}
        isScanning={isAnalyzing}
        onComplete={() => {
          saveState({
            ...state,
            onboarded: true
          });
        }}
      />
    );
  }

  if (isAnalyzing) {
    return (
      <div className="app-container">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Level-Up Celebration Modal */}
      {levelUpMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          right: '20px',
          backgroundColor: 'var(--accent-color)',
          color: '#F0EEF8',
          border: '2px solid #F0EEF8',
          borderRadius: '6px',
          padding: '12px',
          textAlign: 'center',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(124, 109, 250, 0.8)',
          fontFamily: 'var(--font-sans)',
          animation: 'glow-pulse 1.5s infinite'
        }}>
          ✨ {levelUpMessage} ✨
        </div>
      )}

      {/* Floating XP Indicators */}
      <div style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        pointerEvents: 'none',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {floatingXp.map(fxp => (
          <div 
            key={fxp.id}
            style={{
              color: 'var(--success-color)',
              fontWeight: 'bold',
              fontSize: '16px',
              textShadow: '0 0 8px rgba(45, 212, 160, 0.6)',
              animation: 'float-up-fade 1.5s forwards',
              fontFamily: 'var(--font-mono)'
            }}
          >
            +{fxp.amount} XP
          </div>
        ))}
      </div>

      {/* Offline Banner */}
      {apiMode.includes('Unavailable') && (
        <div style={{
          backgroundColor: 'rgba(245, 166, 35, 0.1)',
          border: '1px solid var(--warning-color)',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '11px',
          color: 'var(--warning-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px'
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Backend offline. Some interactive AI-grading features may be limited.</span>
        </div>
      )}

      {/* Main Navigation Tab Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
        <button 
          className={`btn ${currentView === 'dashboard' ? 'btn-primary' : ''}`}
          onClick={() => setCurrentView('dashboard')}
          style={{ flex: 1 }}
        >
          Dashboard
        </button>
        <button 
          className={`btn ${currentView === 'mission' ? 'btn-primary' : ''}`}
          onClick={() => {
            const activeFeat = getActiveFeature();
            if (activeFeat) {
              const activeM = activeFeat.missions.find(m => m.status === 'active');
              if (activeM) setActiveMissionId(activeM.id);
            }
            setCurrentView('mission');
          }}
          disabled={!activeFeatureId}
          style={{ flex: 1 }}
        >
          Mission Control
        </button>
        <button 
          className={`btn ${currentView === 'concepts' ? 'btn-primary' : ''}`}
          onClick={() => setCurrentView('concepts')}
          disabled={!activeFeatureId}
          style={{ flex: 1 }}
        >
          Concept Tree
        </button>
      </div>

      {/* View router */}
      {Object.keys(state.features).length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          textAlign: 'center',
          padding: '24px'
        }}>
          <svg viewBox="0 0 100 100" width="80" height="80" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(124, 109, 250, 0.4))' }}>
            <polygon points="50,15 80,30 80,65 50,85 20,65 20,30" fill="none" stroke="var(--accent-color)" strokeWidth="3"/>
            <path d="M 35,45 H 65 M 50,30 V 60" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <h2 style={{ fontSize: '18px', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Unlock Your Codebase</h2>
          <p className="text-muted" style={{ fontSize: '12px', margin: '0 0 20px 0', maxWidth: '240px' }}>
            Every codebase has an architectural puzzle. Scan this workspace to generate your RPG learning map.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => triggerAnalysis(workspacePath)}
            disabled={isAnalyzing}
            style={{ width: '100%', padding: '12px' }}
          >
            Scan Workspace Structure
          </button>
          <div className="text-muted" style={{ fontSize: '10px', marginTop: '12px', fontFamily: 'var(--font-mono)' }}>
            Engine: {apiMode}
          </div>
        </div>
      ) : (
        <>
          {currentView === 'dashboard' && (
            <RPGDashboard 
              state={state} 
              isAnalyzing={isAnalyzing}
              activeFeatureId={activeFeatureId}
              setActiveFeatureId={(fid) => {
                setActiveFeatureId(fid);
                const feat = state.features[fid];
                const activeM = feat.missions.find(m => m.status === 'active') || feat.missions[0];
                if (activeM) {
                  setActiveMissionId(activeM.id);
                }
              }}
              triggerAnalysis={() => triggerAnalysis(workspacePath)}
              apiMode={apiMode}
            />
          )}

          {currentView === 'mission' && (
            <MissionControl 
              feature={getActiveFeature()!} 
              mission={getActiveMission()}
              conceptGraph={state.concept_graph}
              unlockedPulseIds={unlockedPulseIds}
              selectMission={(mid) => setActiveMissionId(mid)}
              onOpenFile={(path) => {
                if (vscode) vscode.postMessage({ type: 'openFile', filePath: path });
              }}
              onSubmitEvaluation={async (fId, mId, taskId, taskType, taskContent, submission) => {
                return submitTaskEvaluation(fId, mId, taskId, taskType, taskContent, submission);
              }}
            />
          )}

          {currentView === 'concepts' && (
            <MissionControl 
              feature={getActiveFeature()!} 
              mission={getActiveMission()}
              conceptGraph={state.concept_graph}
              unlockedPulseIds={unlockedPulseIds}
              initialTab="concepts"
              selectMission={(mid) => setActiveMissionId(mid)}
              onOpenFile={(path) => {
                if (vscode) vscode.postMessage({ type: 'openFile', filePath: path });
              }}
              onSubmitEvaluation={async (fId, mId, taskId, taskType, taskContent, submission) => {
                return submitTaskEvaluation(fId, mId, taskId, taskType, taskContent, submission);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
