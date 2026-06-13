export interface PlayerState {
  level: number;
  xp: number;
  xpNeeded: number;
  streak: number;
  lastActiveDate: string | null;
  features: Record<string, Feature>;
  concept_graph?: ConceptGraph;
  streakData?: StreakData;
  onboarded?: boolean;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  completionPercent: number;
  understandingScore: UnderstandingScore;
  missions: Mission[];
  lockedConcepts: ConceptPreviewNode[];
}

export interface UnderstandingScore {
  architecture: number;
  system_logic: number;
  file_logic: number;
  function_logic: number;
  syntax: number;
  engineering_decisions: number;
  concepts: number;
  overall: number;
}

export interface Mission {
  id: string;
  pillar: 'architecture' | 'system_logic' | 'file_logic' | 'function_logic' | 'syntax' | 'engineering_decisions' | 'concepts';
  title: string;
  description: string;
  status: 'locked' | 'active' | 'completed';
  tasks: MissionTask[];
  xpReward: number;
  scoreReward: number;
}

export interface MissionTask {
  id: string;
  type: 
    | 'component-match' 
    | 'boundary-sort' 
    | 'flow-sequence' 
    | 'connection-identify'
    | 'trace-path'
    | 'event-mcq'
    | 'file-investigator'
    | 'dependency-map'
    | 'func-rebuild'
    | 'io-mapper'
    | 'reconstruct-text'
    | 'syntax-intent'
    | 'syntax-spotlight'
    | 'lib-rationale'
    | 'syntax-predict'
    | 'syntax-rebuild'
    | 'eng-problem'
    | 'eng-simulator'
    | 'eng-failure'
    | 'eng-tradeoffs'
    | 'alternative-ranker'
    | 'concept-discovery'
    | 'concept-mcq'
    | 'concept-prereq-map'
    | 'concept-apply'
    | 'concept-reconstruction';
  prompt: string;
  isCompleted: boolean;
  content: MissionTaskContent;
}

export interface MissionTaskContent {
  // Phase 1 structures
  matchingItems?: { id: string; name: string; responsibility: string }[];
  boundaryItems?: { id: string; name: string; isInternal: boolean; description: string }[];
  flowSteps?: { id: string; stepNumber: number; text: string; component: string }[];
  nodes?: string[];
  correctConnections?: [string, string][];

  // Phase 2 System Logic
  workflowName?: string;
  triggerDescription?: string;
  steps?: { id: string; order: number; component: string; action: string; isMissing?: boolean }[];
  question?: string;
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;

  // Phase 2 File Logic
  fileName?: string;
  fileContentPreview?: string;
  questionsList?: { id: string; type: 'mcq' | 'multi-select' | 'text'; prompt: string; options?: string[]; correct: any }[];
  nodesList?: string[];
  correctEdges?: [string, string][];

  // Phase 2 Function Logic
  functionSignature?: string;
  functionPurpose?: string;
  functionBody?: string;
  inputsList?: { name: string; type: string; description: string }[];
  outputDetails?: { type: string; description: string };
  errorList?: { type: string; when: string }[];
  variableNames?: string[];
  correctInputs?: string[];
  correctOutputs?: string[];
  correctReturnType?: string;

  // Active Recall Explain-in-your-own-words
  expectedConcepts?: string[];
  sampleSolution?: string;

  // Phase 3 Syntax
  codeSnippet?: string;
  highlightedLine?: string;
  targetPatternType?: string;
  tokens?: string[];
  correctTokenIndices?: number[];
  packageName?: string;
  blanks?: { id: string; label: string; options: string[]; correctAnswer: string }[];

  // Phase 3 Engineering Decisions
  scenario?: string;
  constraints?: string[];
  choices?: { techName: string; isRecommended: boolean; rationaleOptions: string[]; correctRationaleIndex: number }[];
  requiredKeywords?: string[];
  failureScenario?: string;
  diagnosisOptions?: string[];
  correctDiagnosisIndex?: number;
  mitigationOptions?: string[];
  correctMitigationIndex?: number;
  patternName?: string;
  benefits?: string[];
  drawbacks?: string[];
  allStatements?: string[];
  optionsToRank?: string[];
  correctRanking?: number[];

  // Phase 4 Concept properties
  targetConcept?: string;
  conceptsList?: string[];
  correctSelection?: string[];
  correctOrder?: string[];
}

export interface ConceptPreviewNode {
  id: string;
  name: string;
  category: 'Frontend' | 'Backend' | 'Database' | 'DevOps';
  prerequisiteOf?: string;
  description: string;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
  total_missions_completed: number;
  total_xp_earned: number;
  daily_goal: number;
  daily_completed_today: number;
}

export interface ConceptEdge {
  from: string;
  to: string;
  type: string;
}

export interface ConceptNode {
  id: string;
  name: string;
  full_name: string;
  categories: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  present_in_codebase: boolean;
  files_where_used: string[];
  one_liner: string;
  why_used_here: string;
  prerequisites: string[];
  unlocks: string[];
  learn_next: string[];
  status: 'locked' | 'available' | 'completed';
  mastery_score: number;
  tasks: MissionTask[];
}

export interface ConceptGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  categories: string[];
  total_concepts: number;
  available_on_start: number;
}
