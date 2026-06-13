from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Tuple

# API Contracts
class AnalyzeRequest(BaseModel):
    workspace_path: str
    pillars: List[str] = ["architecture", "system_logic", "file_logic", "function_logic"]
    logic_depth: str = "full" # 'full' | 'file_only' | 'function_only'

# Forward reference since MissionTaskContent is used inside EvaluateRequest
class MissionTaskContent(BaseModel):
    # Phase 1 properties
    matchingItems: Optional[List[Dict[str, str]]] = None # id, name, responsibility
    boundaryItems: Optional[List[Dict[str, Any]]] = None # id, name, isInternal, description
    flowSteps: Optional[List[Dict[str, Any]]] = None # id, stepNumber, text, component
    nodes: Optional[List[str]] = None
    correctConnections: Optional[List[Tuple[str, str]]] = None # list of tuples

    # Phase 2 System Logic properties
    workflowName: Optional[str] = None
    triggerDescription: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None # id, order, component, action, isMissing (optional)
    question: Optional[str] = None
    options: Optional[List[str]] = None
    correctOptionIndex: Optional[int] = None
    explanation: Optional[str] = None

    # Phase 2 File Logic properties
    fileName: Optional[str] = None
    fileContentPreview: Optional[str] = None
    questionsList: Optional[List[Dict[str, Any]]] = None # list of question objects: id, type, prompt, options, correct
    nodesList: Optional[List[str]] = None # List of filenames
    correctEdges: Optional[List[Tuple[str, str]]] = None # dependent -> dependency

    # Phase 2 Function Logic properties
    functionSignature: Optional[str] = None
    functionPurpose: Optional[str] = None
    functionBody: Optional[str] = None
    inputsList: Optional[List[Dict[str, str]]] = None # list of parameter details
    outputDetails: Optional[Dict[str, str]] = None # type and description
    errorList: Optional[List[Dict[str, str]]] = None # type, when
    variableNames: Optional[List[str]] = None # variables to sort
    correctInputs: Optional[List[str]] = None
    correctOutputs: Optional[List[str]] = None
    correctReturnType: Optional[str] = None
    
    # Reconstruction-based Active Recall properties
    expectedConcepts: Optional[List[str]] = None # Keywords/semantic tokens expected
    sampleSolution: Optional[str] = None

    # Phase 3 Syntax properties
    codeSnippet: Optional[str] = None
    highlightedLine: Optional[str] = None
    targetPatternType: Optional[str] = None
    tokens: Optional[List[str]] = None
    correctTokenIndices: Optional[List[int]] = None
    packageName: Optional[str] = None
    blanks: Optional[List[Dict[str, Any]]] = None # id, label, options, correctAnswer

    # Phase 3 Engineering Decisions properties
    scenario: Optional[str] = None
    constraints: Optional[List[str]] = None
    choices: Optional[List[Dict[str, Any]]] = None # list of choices with techName, isRecommended, rationaleOptions, correctRationaleIndex
    requiredKeywords: Optional[List[str]] = None
    failureScenario: Optional[str] = None
    diagnosisOptions: Optional[List[str]] = None
    correctDiagnosisIndex: Optional[int] = None
    mitigationOptions: Optional[List[str]] = None
    correctMitigationIndex: Optional[int] = None
    patternName: Optional[str] = None
    benefits: Optional[List[str]] = None
    drawbacks: Optional[List[str]] = None
    allStatements: Optional[List[str]] = None
    optionsToRank: Optional[List[str]] = None
    correctRanking: Optional[List[int]] = None

    # Phase 4 Concept properties
    targetConcept: Optional[str] = None
    conceptsList: Optional[List[str]] = None
    correctSelection: Optional[List[str]] = None
    correctOrder: Optional[List[str]] = None

class EvaluateRequest(BaseModel):
    feature_id: str
    mission_id: str
    task_id: str
    task_type: str # 'component-match' | 'boundary-sort' | 'flow-sequence' | 'connection-identify' | 'trace-path' | 'event-mcq' | 'file-investigator' | 'dependency-map' | 'func-rebuild' | 'io-mapper' | 'reconstruct-text' | 'syntax-intent' | 'syntax-spotlight' | 'lib-rationale' | 'syntax-predict' | 'syntax-rebuild' | 'eng-problem' | 'eng-simulator' | 'eng-failure' | 'eng-tradeoffs' | 'alternative-ranker'
    task_content: MissionTaskContent
    submission: Dict[str, Any]

class EvaluateResponse(BaseModel):
    isCorrect: bool
    xpGained: int
    scoreReward: int
    feedback: str

# Data Structures
class UnderstandingScore(BaseModel):
    architecture: float = 0.0
    system_logic: float = 0.0
    file_logic: float = 0.0
    function_logic: float = 0.0
    syntax: float = 0.0
    engineering_decisions: float = 0.0
    concepts: float = 0.0
    overall: float = 0.0

class ConceptPreviewNode(BaseModel):
    id: str
    name: str
    category: str # 'Frontend' | 'Backend' | 'Database' | 'DevOps'
    prerequisiteOf: Optional[str] = None
    description: str

class MissionTask(BaseModel):
    id: str
    type: str # 'component-match' | 'boundary-sort' | 'flow-sequence' | 'connection-identify' | ...
    prompt: str
    isCompleted: bool = False
    content: MissionTaskContent

class Mission(BaseModel):
    id: str
    pillar: str # 'architecture' | 'system_logic' | 'file_logic' | 'function_logic' | 'syntax' | ...
    title: str
    description: str
    status: str = "locked" # 'locked' | 'active' | 'completed'
    tasks: List[MissionTask]
    xpReward: int
    scoreReward: int

class ConceptNode(BaseModel):
    id: str
    name: str
    full_name: str
    categories: List[str]
    difficulty: str # 'beginner' | 'intermediate' | 'advanced'
    present_in_codebase: bool
    files_where_used: List[str]
    one_liner: str
    why_used_here: str
    prerequisites: List[str]
    unlocks: List[str]
    learn_next: List[str]
    status: str = "locked" # 'locked' | 'available' | 'completed'
    mastery_score: float = 0.0
    tasks: List[MissionTask] = Field(default_factory=list)

class ConceptEdge(BaseModel):
    from_node: str = Field(..., alias="from")
    to: str
    type: str = "prerequisite"

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class ConceptGraph(BaseModel):
    nodes: List[ConceptNode] = Field(default_factory=list)
    edges: List[ConceptEdge] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    total_concepts: int = 0
    available_on_start: int = 0

class Feature(BaseModel):
    id: str
    name: str
    description: str
    completionPercent: int = 100
    understandingScore: UnderstandingScore = Field(default_factory=UnderstandingScore)
    missions: List[Mission] = Field(default_factory=list)
    lockedConcepts: List[ConceptPreviewNode] = Field(default_factory=list)

class AnalyzeResponse(BaseModel):
    features: Dict[str, Feature]
    concept_graph: Optional[ConceptGraph] = None
