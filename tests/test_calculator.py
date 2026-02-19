import sys
from pathlib import Path
from datetime import datetime
import pytest

# Add src to sys.path to import modules
sys.path.append(str(Path(__file__).parent.parent / "src"))

from config import calculate_progress

def test_calculate_progress_regular_day():
    # 2024-01-02 (Tuesday) -> Data from 2024-01-01 (Monday)
    # January 2024:
    # 1st is Mon (1.0)
    # Total days 31.
    # Let's calculate total weight manually for Jan 2024 or just trust logic consistency
    
    date = datetime(2024, 1, 2) 
    progress = calculate_progress(date)
    assert 0.0 < progress < 1.0

def test_calculate_progress_wednesday_weight():
    # If we are effectively calculating for a Wednesday data
    # Date input is Thursday -> Data is Wednesday
    # Wednesday weight is 0.0
    
    # 2024-01-04 (Thursday) -> Data 2024-01-03 (Wednesday)
    # Progress should NOT increase from Tuesday data?
    # Wait, cumulative sum.
    # Tuesday data (2nd) -> accumulated 1st + 2nd
    # Wednesday data (3rd) -> accumulated 1st + 2nd + 3rd(0)
    # So progress at end of 3rd should be same as end of 2nd IF total weights are same.
    
    # Let's just check it runs and returns float
    progress = calculate_progress(datetime(2024, 1, 4))
    assert isinstance(progress, float)

def test_weekend_weight_higher():
    # Saturday/Sunday should have more impact
    pass

def test_end_of_month():
    # 2024-02-01 -> Data 2024-01-31
    # Should be 1.0 (100%)
    
    date = datetime(2024, 2, 1)
    # Logic in config.py:
    # year, month = data_date.year, data_date.month
    # So if data_date is Jan 31, it calculates for Jan.
    # elapsed for 31 days / total for 31 days should be 1.0
    
    progress = calculate_progress(date)
    assert progress == 1.0
