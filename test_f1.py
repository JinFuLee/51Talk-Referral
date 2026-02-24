import sys
from pathlib import Path
import logging

PROJECT_ROOT = Path("/Users/felixmacbookairm4/Desktop/ref-ops-engine")
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

logging.basicConfig(level=logging.DEBUG)

from core.loaders.ops_loader import OpsLoader
from core.project_config import load_project_config

config = load_project_config("referral")
loader = OpsLoader(input_dir=str(PROJECT_ROOT / "input"), project_config=config)

res_f1 = loader._load_funnel_efficiency()
print("F1 Result:", len(res_f1.get("records", [])))

res_f2 = loader._load_section_efficiency()
print("F2 Result:", len(res_f2.get("records", [])))
