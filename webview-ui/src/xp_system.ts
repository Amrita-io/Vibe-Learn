export const XP_TABLE: Record<string, number> = {
  // Architecture
  "component-match": 50,
  "boundary-sort": 40,
  "flow-sequence": 60,
  "connection-identify": 60,

  // Logic
  "trace-path": 70,
  "event-mcq": 40,
  "file-investigator": 80,
  "dependency-map": 70,
  "func-rebuild": 90,
  "io-mapper": 50,
  "reconstruct-text": 60,

  // Syntax
  "syntax-intent": 40,
  "lib-rationale": 60,
  "syntax-spotlight": 70,
  "syntax-predict": 40,
  "syntax-rebuild": 65,

  // Engineering Decisions
  "eng-problem": 80,
  "eng-simulator": 90,
  "eng-failure": 80,
  "eng-tradeoffs": 70,
  "alternative-ranker": 85,
  "eng-alternative-ranker": 85,

  // Concepts (Mastery tasks)
  "concept-discovery": 80,
  "concept-mcq": 100,
  "concept-prereq-map": 80,
  "concept-apply": 150,
  "concept-reconstruction": 150
};

export interface LevelInfo {
  level: number;
  title: string;
  xpInLevel: number;
  xpNeededForNext: number;
  percent: number;
  totalXp: number;
}

export const LEVELS = [
  { level: 1, title: "Junior Inspector",   xp_required: 0 },
  { level: 2, title: "System Investigator", xp_required: 300 },
  { level: 3, title: "Senior Analyst",     xp_required: 800 },
  { level: 4, title: "Lead Architect",     xp_required: 1800 },
  { level: 5, title: "Master Engineer",    xp_required: 3500 },
];

export function getLevelInfo(totalXp: number): LevelInfo {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].xp_required) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    } else {
      break;
    }
  }
  
  if (!nextLevel) {
    // Max level reached
    return {
      level: currentLevel.level,
      title: currentLevel.title,
      xpInLevel: totalXp - currentLevel.xp_required,
      xpNeededForNext: 0,
      percent: 100,
      totalXp
    };
  }
  
  const range = nextLevel.xp_required - currentLevel.xp_required;
  const progress = totalXp - currentLevel.xp_required;
  const percent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  
  return {
    level: currentLevel.level,
    title: currentLevel.title,
    xpInLevel: progress,
    xpNeededForNext: range,
    percent,
    totalXp
  };
}
