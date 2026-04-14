from ..models import Sample
from typing import List

# Temporary in-memory DB placeholder
SAMPLES_DB: List[Sample] = []

def create_sample_service(sample_data):
    # Duplicate detection
    for s in SAMPLES_DB:
        if s.client_name == sample_data.client_name and s.material_type == sample_data.material_type:
            raise ValueError("Duplicate sample")
    sample_id = len(SAMPLES_DB) + 1
    new_sample = Sample(
        sample_id=sample_id,
        material_type=sample_data.material_type,
        client_name=sample_data.client_name,
        lifecycle_state="Registered"
    )
    SAMPLES_DB.append(new_sample)
    return new_sample

def get_samples_service():
    return SAMPLES_DB

def get_sample_service(sample_id: int):
    for s in SAMPLES_DB:
        if s.sample_id == sample_id:
            return s
    return None

def update_sample_service(sample_id: int, sample_data):
    sample = get_sample_service(sample_id)
    if not sample:
        raise ValueError("Sample not found")
    sample.material_type = sample_data.material_type
    sample.client_name = sample_data.client_name
    return sample

def delete_sample_service(sample_id: int):
    global SAMPLES_DB
    SAMPLES_DB = [s for s in SAMPLES_DB if s.sample_id != sample_id]