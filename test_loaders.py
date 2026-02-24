import sys
from pathlib import Path
import logging

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

logging.basicConfig(level=logging.DEBUG)

from core.loaders.ops_loader import OpsLoader
from core.project_config import load_project_config

config = load_project_config("referral")
loader = OpsLoader(input_dir=str(PROJECT_ROOT / "input"), project_config=config)

print("Starting F1 test...")
res_f1 = loader._load_funnel_efficiency()
print("F1 Result records:", len(res_f1.get("records", [])))

print("Starting F2 test...")
res_f2 = loader._load_section_efficiency()
print("F2 Result records:", len(res_f2.get("records", [])))
