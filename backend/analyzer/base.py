from abc import ABC, abstractmethod
from typing import Dict
from analyzer.models import Feature

class BaseAnalyzer(ABC):
    @abstractmethod
    def analyze(self, workspace_path: str) -> Dict[str, Feature]:
        """
        Analyzes the local workspace directory and returns a dictionary
        of features with architectural components and generated missions.
        """
        pass
