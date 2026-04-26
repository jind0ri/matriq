from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from io import BytesIO
import hashlib
import httpx
from urllib.parse import quote
import json
from datetime import datetime
from math import pi

from ..config import (
    ROLE_ACCOUNTING,
    ROLE_ADMIN,
    ROLE_QA,
    ROLE_SENIOR_TECH,
    ROLE_LAB_TECH,
)
from ..config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET
from ..database import fetchall
from ..schemas import SampleRegistrationRequest
from ..services.audit_service import log_event
from ..services.auth_service import require_roles
from ..services.sample_service import (
    create_sample_only,
    dashboard,
    get_sample,
    list_reviews,
    list_samples,
)

router = APIRouter(prefix="/api", tags=["Samples"])


# ============================================================
# STANDARDIZED TEST RESULT CONSTANTS
# ============================================================

RESULT_PASS = "PASS"
RESULT_FAIL = "FAIL"
RESULT_RECORDED = "RECORDED"
RESULT_INCOMPLETE = "INCOMPLETE"


# ============================================================
# SHARED HELPERS
# ============================================================

def is_blank(value):
    return value is None or value == ""


def to_float(value, field_name):
    try:
        if is_blank(value):
            raise ValueError()
        return float(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"{field_name} must be numeric")


def optional_float(value, field_name):
    if is_blank(value):
        return None
    return to_float(value, field_name)


def require_one_of(value, field_name, allowed_values):
    if value not in allowed_values:
        allowed_text = ", ".join(sorted(allowed_values))
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be one of: {allowed_text}",
        )
    return value


def get_threshold(payload, *field_names):
    """
    Returns the first available numeric threshold from multiple possible field names.
    This lets the backend support both older frontend field names and newer ones.
    """
    for field in field_names:
        if not is_blank(payload.get(field)):
            return to_float(payload.get(field), field)
    return None


def normalize_observation(value):
    if value is None:
        return ""
    return str(value).strip().lower().replace(" ", "_").replace("-", "_")


def get_user_name_map():
    rows = fetchall(
        """
        SELECT
            user_id,
            full_name,
            username
        FROM users
        """
    )

    names = {}

    for row in rows:
        user_id = row.get("user_id")
        if user_id is None:
            continue

        display_name = row.get("full_name") or row.get("username") or f"User {user_id}"
        names[str(user_id)] = display_name

    return names


def resolve_user_name(user_id, user_names):
    if user_id is None or user_id == "":
        return None

    return user_names.get(str(user_id), f"User {user_id}")


def attach_user_name(target, source_key, user_names):
    if not isinstance(target, dict):
        return

    user_id = target.get(source_key)
    display_name = resolve_user_name(user_id, user_names)

    if not display_name:
        return

    target[f"{source_key}_name"] = display_name
    target[f"{source_key}_display"] = display_name
    target[f"{source_key}_full_name"] = display_name


def hydrate_sample_user_names(item, user_names=None):
    if not item:
        return item

    if user_names is None:
        user_names = get_user_name_map()

    hydrated = dict(item)

    attach_user_name(hydrated, "registered_by", user_names)

    metadata = hydrated.get("device_metadata") or {}

    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except Exception:
            metadata = {}

    payment = metadata.get("payment") or {}
    qa = metadata.get("qa") or {}
    test_data = metadata.get("test_data") or {}

    attach_user_name(payment, "payment_updated_by", user_names)

    payment_history = payment.get("payment_history") or []
    if isinstance(payment_history, list):
        for entry in payment_history:
            if isinstance(entry, dict):
                attach_user_name(entry, "updated_by", user_names)

    attach_user_name(qa, "pre_testing_reviewed_by", user_names)
    attach_user_name(qa, "result_reviewed_by", user_names)
    attach_user_name(qa, "release_reviewed_by", user_names)

    attach_user_name(test_data, "entered_by", user_names)

    qa_override = test_data.get("qa_override") or {}
    attach_user_name(qa_override, "overridden_by", user_names)

    if qa_override:
        test_data["qa_override"] = qa_override

    metadata["test_data"] = test_data
    metadata["payment"] = payment
    metadata["qa"] = qa

    hydrated["device_metadata"] = metadata

    return hydrated


def hydrate_samples_user_names(items):
    user_names = get_user_name_map()
    return [hydrate_sample_user_names(item, user_names) for item in items]


# ============================================================
# STANDARD-ALIGNED TEST EVALUATORS
# ============================================================

def evaluate_concrete_compression(payload):
    """
    ASTM C39/C39M
    Determines compressive strength of cylindrical concrete specimens.
    """
    diameter = to_float(payload.get("specimen_diameter_mm"), "specimen_diameter_mm")
    height = optional_float(payload.get("specimen_height_mm"), "specimen_height_mm")
    max_load = to_float(payload.get("max_load_kn"), "max_load_kn")
    required = to_float(payload.get("required_strength_mpa"), "required_strength_mpa")

    area = pi * (diameter / 2) ** 2
    strength = (max_load * 1000) / area

    result = RESULT_PASS if strength >= required else RESULT_FAIL

    remarks = (
        "Compressive strength meets or exceeds the required design strength."
        if result == RESULT_PASS
        else "Compressive strength is below the required design strength."
    )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM C39/C39M",
            "test_name": "Concrete Compression Test",
            "specimen_diameter_mm": diameter,
            "specimen_height_mm": height,
            "max_load_kn": max_load,
            "cross_sectional_area_mm2": round(area, 2),
            "compressive_strength_mpa": round(strength, 2),
            "required_strength_mpa": required,
            "evaluation_basis": "PASS if compressive_strength_mpa >= required_strength_mpa",
        },
    }


def evaluate_concrete_slump(payload):
    """
    ASTM C143/C143M
    Measures workability/consistency of fresh concrete.
    """
    slump = to_float(payload.get("slump_mm"), "slump_mm")

    min_slump = get_threshold(payload, "min_slump_mm")
    max_slump = get_threshold(payload, "max_slump_mm", "required_slump_mm")

    slump_type = normalize_observation(payload.get("slump_type") or "true")
    allowed_slump_types = {"true", "shear", "collapse"}

    if slump_type not in allowed_slump_types:
        raise HTTPException(
            status_code=400,
            detail="slump_type must be true, shear, or collapse",
        )

    if min_slump is not None and max_slump is not None:
        if min_slump > max_slump:
            raise HTTPException(
                status_code=400,
                detail="min_slump_mm cannot be greater than max_slump_mm",
            )

        result = (
            RESULT_PASS
            if min_slump <= slump <= max_slump and slump_type == "true"
            else RESULT_FAIL
        )

        remarks = (
            "Slump is within the specified range and is classified as true slump."
            if result == RESULT_PASS
            else "Slump is outside the specified range or is not classified as true slump."
        )

    elif max_slump is not None:
        result = RESULT_PASS if slump <= max_slump and slump_type == "true" else RESULT_FAIL
        remarks = (
            "Slump does not exceed the specified maximum and is classified as true slump."
            if result == RESULT_PASS
            else "Slump exceeds the specified maximum or is not classified as true slump."
        )

    else:
        result = RESULT_RECORDED
        remarks = (
            "Slump measurement recorded. No project/client acceptance range was provided, "
            "so the system did not assign PASS or FAIL."
        )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM C143/C143M",
            "test_name": "Concrete Slump Test",
            "slump_mm": slump,
            "min_slump_mm": min_slump,
            "max_slump_mm": max_slump,
            "slump_type": slump_type,
            "evaluation_basis": (
                "PASS if slump is within specified range and slump_type is true. "
                "RECORDED if no acceptance range is provided."
            ),
        },
    }


def evaluate_concrete_flexural(payload):
    """
    ASTM C78/C78M
    Determines flexural strength / modulus of rupture using simple beam
    with third-point loading.
    """
    required = optional_float(payload.get("required_strength_mpa"), "required_strength_mpa")

    flexural_strength = optional_float(
        payload.get("flexural_strength_mpa"),
        "flexural_strength_mpa",
    )

    width = optional_float(payload.get("beam_width_mm"), "beam_width_mm")
    depth = optional_float(payload.get("beam_depth_mm"), "beam_depth_mm")
    span_length = optional_float(payload.get("span_length_mm"), "span_length_mm")
    max_load = optional_float(payload.get("max_load_kn"), "max_load_kn")

    if flexural_strength is None:
        needed = {
            "beam_width_mm": width,
            "beam_depth_mm": depth,
            "span_length_mm": span_length,
            "max_load_kn": max_load,
        }

        missing = [field for field, value in needed.items() if value is None]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Provide either flexural_strength_mpa or all computed fields: "
                    + ", ".join(missing)
                ),
            )

        flexural_strength = (max_load * 1000 * span_length) / (width * (depth ** 2))

    if required is not None:
        result = RESULT_PASS if flexural_strength >= required else RESULT_FAIL
        remarks = (
            "Flexural strength meets or exceeds the specified requirement."
            if result == RESULT_PASS
            else "Flexural strength is below the specified requirement."
        )
    else:
        result = RESULT_RECORDED
        remarks = (
            "Flexural strength recorded. No required strength was provided, "
            "so the system did not assign PASS or FAIL."
        )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM C78/C78M",
            "test_name": "Concrete Flexural Strength Test",
            "beam_width_mm": width,
            "beam_depth_mm": depth,
            "span_length_mm": span_length,
            "max_load_kn": max_load,
            "flexural_strength_mpa": round(flexural_strength, 2),
            "required_strength_mpa": required,
            "evaluation_basis": (
                "PASS if flexural_strength_mpa >= required_strength_mpa. "
                "RECORDED if no required strength is provided."
            ),
        },
    }


def evaluate_rsb_tensile(payload):
    """
    ASTM A370 / ASTM A615/A615M
    Determines mechanical properties of reinforcing steel bars.
    """
    yield_strength = to_float(payload.get("yield_strength_mpa"), "yield_strength_mpa")

    tensile_strength = optional_float(
        payload.get("tensile_strength_mpa"),
        "tensile_strength_mpa",
    )
    elongation = optional_float(
        payload.get("elongation_percent"),
        "elongation_percent",
    )

    required_yield = get_threshold(payload, "required_yield_mpa", "min_yield_mpa")
    required_tensile = get_threshold(payload, "required_tensile_mpa", "min_tensile_mpa")
    required_elongation = get_threshold(
        payload,
        "required_elongation_percent",
        "min_elongation_percent",
    )

    checks = []

    if required_yield is not None:
        checks.append(yield_strength >= required_yield)

    if required_tensile is not None:
        if tensile_strength is None:
            raise HTTPException(
                status_code=400,
                detail="tensile_strength_mpa is required when required_tensile_mpa is provided",
            )
        checks.append(tensile_strength >= required_tensile)

    if required_elongation is not None:
        if elongation is None:
            raise HTTPException(
                status_code=400,
                detail="elongation_percent is required when required_elongation_percent is provided",
            )
        checks.append(elongation >= required_elongation)

    if checks:
        result = RESULT_PASS if all(checks) else RESULT_FAIL
        remarks = (
            "RSB tensile properties satisfy the specified minimum requirements."
            if result == RESULT_PASS
            else "One or more RSB tensile properties are below the specified minimum requirements."
        )
    else:
        result = RESULT_RECORDED
        remarks = (
            "RSB tensile properties recorded. No minimum acceptance thresholds were provided, "
            "so the system did not assign PASS or FAIL."
        )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM A370 / ASTM A615/A615M",
            "test_name": "RSB Tensile Test",
            "yield_strength_mpa": yield_strength,
            "tensile_strength_mpa": tensile_strength,
            "elongation_percent": elongation,
            "required_yield_mpa": required_yield,
            "required_tensile_mpa": required_tensile,
            "required_elongation_percent": required_elongation,
            "evaluation_basis": (
                "PASS if all provided mechanical property requirements are satisfied. "
                "RECORDED if no acceptance thresholds are provided."
            ),
        },
    }


def evaluate_rsb_bend(payload):
    """
    ASTM A370 / ASTM A615/A615M
    Bend test evaluates ductility.
    """
    observation = normalize_observation(
        payload.get("bend_observation")
        or payload.get("bend_result")
        or payload.get("observation")
    )

    pass_observations = {
        "no_crack",
        "no_fracture",
        "no_crack_or_fracture",
        "satisfactory",
        "passed_observation",
        "ok",
    }

    fail_observations = {
        "crack",
        "cracked",
        "visible_crack",
        "fracture",
        "fractured",
        "break",
        "broken",
        "failed_observation",
    }

    if observation in {"pass", "passed"}:
        raise HTTPException(
            status_code=400,
            detail=(
                "Do not submit PASS for rsb_bend. Submit bend_observation instead, "
                "such as no_crack, crack, fracture, or broken."
            ),
        )

    if observation in {"fail", "failed"}:
        raise HTTPException(
            status_code=400,
            detail=(
                "Do not submit FAIL for rsb_bend. Submit bend_observation instead, "
                "such as no_crack, crack, fracture, or broken."
            ),
        )

    if observation in pass_observations:
        result = RESULT_PASS
        remarks = "No crack or fracture was observed during the bend test."
    elif observation in fail_observations:
        result = RESULT_FAIL
        remarks = "Crack, fracture, or break was observed during the bend test."
    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "bend_observation is required and must describe the observed condition. "
                "Use values like no_crack, no_fracture, crack, fracture, or broken."
            ),
        )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM A370 / ASTM A615/A615M",
            "test_name": "RSB Bend Test",
            "bend_observation": observation,
            "evaluation_basis": (
                "PASS if no crack/fracture is observed. "
                "FAIL if crack, fracture, or break is observed."
            ),
        },
    }


def evaluate_soil_moisture(payload):
    """
    ASTM D2216
    Determines moisture content of soil/rock by mass.
    """
    moisture = optional_float(payload.get("moisture_content"), "moisture_content")

    wet_mass = optional_float(payload.get("wet_mass_g"), "wet_mass_g")
    dry_mass = optional_float(payload.get("dry_mass_g"), "dry_mass_g")

    if moisture is None:
        if wet_mass is None or dry_mass is None:
            raise HTTPException(
                status_code=400,
                detail="Provide either moisture_content or both wet_mass_g and dry_mass_g",
            )

        if dry_mass == 0:
            raise HTTPException(status_code=400, detail="dry_mass_g cannot be zero")

        moisture = ((wet_mass - dry_mass) / dry_mass) * 100

    max_allowed = optional_float(payload.get("max_moisture"), "max_moisture")

    if max_allowed is not None:
        result = RESULT_PASS if moisture <= max_allowed else RESULT_FAIL
        remarks = (
            "Moisture content is within the specified maximum limit."
            if result == RESULT_PASS
            else "Moisture content exceeds the specified maximum limit."
        )
    else:
        result = RESULT_RECORDED
        remarks = (
            "Moisture content recorded. No maximum moisture requirement was provided, "
            "so the system did not assign PASS or FAIL."
        )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM D2216",
            "test_name": "Soil Moisture Content Test",
            "wet_mass_g": wet_mass,
            "dry_mass_g": dry_mass,
            "moisture_content": round(moisture, 2),
            "max_moisture": max_allowed,
            "uscs_classification": payload.get("uscs_classification") or None,
            "evaluation_basis": (
                "PASS if moisture_content <= max_moisture. "
                "RECORDED if no maximum moisture requirement is provided."
            ),
        },
    }


def evaluate_soil_classification(payload):
    """
    ASTM D2487
    USCS soil classification.
    """
    uscs = payload.get("uscs_classification")
    required_uscs = payload.get("required_uscs_classification")

    if is_blank(uscs):
        raise HTTPException(status_code=400, detail="uscs_classification is required")

    uscs = str(uscs).strip().upper()
    required_uscs = str(required_uscs).strip().upper() if not is_blank(required_uscs) else None

    if required_uscs:
        result = RESULT_PASS if uscs == required_uscs else RESULT_FAIL
        remarks = (
            "USCS classification matches the specified requirement."
            if result == RESULT_PASS
            else "USCS classification does not match the specified requirement."
        )
    else:
        result = RESULT_RECORDED
        remarks = (
            "USCS classification recorded. No required classification was provided, "
            "so the system did not assign PASS or FAIL."
        )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM D2487",
            "test_name": "Soil Classification - USCS",
            "uscs_classification": uscs,
            "required_uscs_classification": required_uscs,
            "evaluation_basis": (
                "PASS if uscs_classification equals required_uscs_classification. "
                "RECORDED if no required classification is provided."
            ),
        },
    }


def evaluate_aggregate_sieve(payload):
    """
    ASTM C136/C136M
    Sieve analysis for fine/coarse aggregates.
    """
    passing = to_float(payload.get("percent_passing"), "percent_passing")

    min_required = optional_float(payload.get("min_passing"), "min_passing")
    max_required = optional_float(payload.get("max_passing"), "max_passing")

    if min_required is not None and max_required is not None:
        if min_required > max_required:
            raise HTTPException(
                status_code=400,
                detail="min_passing cannot be greater than max_passing",
            )

        result = RESULT_PASS if min_required <= passing <= max_required else RESULT_FAIL
        remarks = (
            "Aggregate percent passing is within the specified gradation limits."
            if result == RESULT_PASS
            else "Aggregate percent passing is outside the specified gradation limits."
        )

    elif min_required is not None:
        result = RESULT_PASS if passing >= min_required else RESULT_FAIL
        remarks = (
            "Aggregate percent passing meets the specified minimum limit."
            if result == RESULT_PASS
            else "Aggregate percent passing is below the specified minimum limit."
        )

    elif max_required is not None:
        result = RESULT_PASS if passing <= max_required else RESULT_FAIL
        remarks = (
            "Aggregate percent passing does not exceed the specified maximum limit."
            if result == RESULT_PASS
            else "Aggregate percent passing exceeds the specified maximum limit."
        )

    else:
        result = RESULT_RECORDED
        remarks = (
            "Aggregate sieve result recorded. No gradation limits were provided, "
            "so the system did not assign PASS or FAIL."
        )

    absorption = optional_float(payload.get("absorption_percent"), "absorption_percent")
    abrasion_loss = optional_float(payload.get("abrasion_loss_percent"), "abrasion_loss_percent")

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM C136/C136M",
            "test_name": "Aggregate Sieve Analysis",
            "percent_passing": passing,
            "min_passing": min_required,
            "max_passing": max_required,
            "absorption_percent": absorption,
            "abrasion_loss_percent": abrasion_loss,
            "evaluation_basis": (
                "PASS if percent_passing is within provided limits. "
                "RECORDED if no gradation limits are provided."
            ),
        },
    }


def evaluate_aggregate_abrasion(payload):
    """
    ASTM C131/C131M / ASTM C535
    Los Angeles abrasion resistance.
    """
    abrasion_loss = to_float(payload.get("abrasion_loss_percent"), "abrasion_loss_percent")
    max_loss = to_float(payload.get("max_abrasion_loss_percent"), "max_abrasion_loss_percent")

    result = RESULT_PASS if abrasion_loss <= max_loss else RESULT_FAIL

    remarks = (
        "LA abrasion loss is within the specified maximum limit."
        if result == RESULT_PASS
        else "LA abrasion loss exceeds the specified maximum limit."
    )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM C131/C131M / ASTM C535",
            "test_name": "Los Angeles Abrasion Test",
            "abrasion_loss_percent": abrasion_loss,
            "max_abrasion_loss_percent": max_loss,
            "evaluation_basis": "PASS if abrasion_loss_percent <= max_abrasion_loss_percent",
        },
    }


def evaluate_aggregate_soundness(payload):
    """
    ASTM C88/C88M
    Soundness of aggregates by sodium sulfate or magnesium sulfate.
    """
    soundness_loss = to_float(payload.get("soundness_loss_percent"), "soundness_loss_percent")
    max_loss = to_float(payload.get("max_soundness_loss_percent"), "max_soundness_loss_percent")

    salt_type = payload.get("salt_type") or None
    cycles = optional_float(payload.get("cycles_completed"), "cycles_completed")

    result = RESULT_PASS if soundness_loss <= max_loss else RESULT_FAIL

    remarks = (
        "Soundness loss is within the specified maximum limit."
        if result == RESULT_PASS
        else "Soundness loss exceeds the specified maximum limit."
    )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM C88/C88M",
            "test_name": "Aggregate Soundness Test",
            "soundness_loss_percent": soundness_loss,
            "max_soundness_loss_percent": max_loss,
            "salt_type": salt_type,
            "cycles_completed": cycles,
            "evaluation_basis": "PASS if soundness_loss_percent <= max_soundness_loss_percent",
        },
    }


def evaluate_aggregate_organic_impurities(payload):
    """
    ASTM C40/C40M
    Organic impurities in fine aggregates.
    """
    color = normalize_observation(payload.get("color_comparison"))

    pass_values = {"lighter", "lighter_than_standard", "less_than_standard"}
    fail_values = {"equal", "equal_to_standard", "darker", "darker_than_standard"}

    if color in pass_values:
        result = RESULT_PASS
        remarks = "Organic impurities color comparison is lighter than the standard."
    elif color in fail_values:
        result = RESULT_FAIL
        remarks = "Organic impurities color comparison is equal to or darker than the standard."
    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "color_comparison must be lighter_than_standard, equal_to_standard, "
                "or darker_than_standard"
            ),
        )

    return {
        "result": result,
        "remarks": remarks,
        "data": {
            "standard": "ASTM C40/C40M",
            "test_name": "Organic Impurities in Fine Aggregates",
            "color_comparison": color,
            "evaluation_basis": (
                "PASS if color is lighter than standard. "
                "FAIL if color is equal to or darker than standard."
            ),
        },
    }


def evaluate_standardized_test(test_type, payload):
    """
    Central rule engine.

    Add new tests here only.
    This prevents technicians from manually deciding PASS/FAIL.
    """
    evaluators = {
        "concrete_compression": evaluate_concrete_compression,
        "concrete_slump": evaluate_concrete_slump,
        "concrete_flexural": evaluate_concrete_flexural,
        "rsb_tensile": evaluate_rsb_tensile,
        "rsb_bend": evaluate_rsb_bend,
        "soil_moisture": evaluate_soil_moisture,
        "soil_classification": evaluate_soil_classification,
        "aggregate_sieve": evaluate_aggregate_sieve,
        "aggregate_abrasion": evaluate_aggregate_abrasion,
        "aggregate_soundness": evaluate_aggregate_soundness,
        "aggregate_organic_impurities": evaluate_aggregate_organic_impurities,
    }

    evaluator = evaluators.get(test_type)
    if not evaluator:
        raise HTTPException(status_code=400, detail="Invalid test_type")

    return evaluator(payload)


# ============================================================
# SAMPLE REGISTRATION
# ============================================================

@router.post("/samples")
def create_sample(
    payload: SampleRegistrationRequest,
    request: Request,
    current_user=Depends(require_roles(ROLE_LAB_TECH, ROLE_SENIOR_TECH)),
):
    material_map = {
        "concrete": "Concrete",
        "rsb": "Reinforcing Steel Bar",
        "soil_aggregates": "Soil Aggregates",
        "Concrete": "Concrete",
        "Reinforcing Steel Bar": "Reinforcing Steel Bar",
        "Soil Aggregates": "Soil Aggregates",
    }

    material_type = material_map.get(payload.material_type)
    if not material_type:
        raise HTTPException(
            status_code=400,
            detail="material_type must be one of concrete, rsb, soil_aggregates.",
        )

    db_decision = "Auto-Accepted" if payload.decision == "AUTO_ACCEPTED" else "Manual-Review"
    state = "Registered" if payload.decision == "AUTO_ACCEPTED" else "For Review"

    ai_predicted_label = (
        material_map.get(payload.ai_predicted_label, payload.ai_predicted_label)
        if payload.ai_predicted_label
        else material_type
    )

    sample = create_sample_only(
        client_name=payload.client_name.strip(),
        project_reference=payload.project_id.strip(),
        material_type=material_type,
        current_state=state,
        branch_id=payload.branch_id,
        registered_by=current_user["user_id"],
        registered_by_role=current_user["role"],
        image_path=payload.image_path,
        is_immutable=False,
        ai_predicted_label=ai_predicted_label,
        confidence_score=float(payload.ai_confidence_score or 0.0),
        decision=db_decision,
        model_version=payload.model_version,
        device_metadata=payload.device_metadata or {},
        original_filename=payload.image_path.split("/")[-1] if payload.image_path else None,
        image_sha256=hashlib.sha256(payload.image_path.encode("utf-8")).hexdigest()
        if payload.image_path
        else None,
        notes=None,
    )

    sample = hydrate_sample_user_names(get_sample(sample["sample_id"]))

    log_event(
        action="CREATE_SAMPLE",
        endpoint_accessed="/api/samples",
        user_id=current_user["user_id"],
        sample_id=None,
        new_value=sample,
        ip_address=request.client.host if request.client else None,
    )

    return sample


@router.get("/samples")
def samples(
    request: Request,
    current_user=Depends(
        require_roles(
            ROLE_LAB_TECH,
            ROLE_SENIOR_TECH,
            ROLE_QA,
            ROLE_ADMIN,
            ROLE_ACCOUNTING,
        )
    ),
):
    data = hydrate_samples_user_names(list_samples())

    log_event(
        action="LIST_SAMPLES",
        endpoint_accessed="/api/samples",
        user_id=current_user["user_id"],
        new_value={"count": len(data)},
        ip_address=request.client.host if request.client else None,
    )

    return data


@router.get("/samples/{sample_id}/image")
def sample_image(
    sample_id: str,
    request: Request,
    current_user=Depends(
        require_roles(ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN)
    ),
):
    item = get_sample(sample_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    image_path = (item.get("image_path") or "").strip()
    if not image_path:
        raise HTTPException(status_code=404, detail="No image available for this sample")

    object_key = image_path
    base_supabase_url = SUPABASE_URL.rstrip("/")

    public_prefix = f"{base_supabase_url}/storage/v1/object/public/{SUPABASE_BUCKET}/"
    sign_prefix = f"{base_supabase_url}/storage/v1/object/sign/{SUPABASE_BUCKET}/"

    if object_key.startswith(public_prefix):
        object_key = object_key[len(public_prefix):]
    elif object_key.startswith(sign_prefix):
        object_key = object_key[len(sign_prefix):].split("?", 1)[0]
    else:
        bucket_prefix = f"{SUPABASE_BUCKET}/"
        if object_key.startswith(bucket_prefix):
            object_key = object_key[len(bucket_prefix):]

    object_key = object_key.strip("/")

    if not object_key:
        raise HTTPException(status_code=400, detail=f"Invalid stored image_path: {image_path}")

    safe_object_key = quote(object_key)
    download_url = (
        f"{base_supabase_url}/storage/v1/object/authenticated/"
        f"{SUPABASE_BUCKET}/{safe_object_key}"
    )

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
    }

    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            image_resp = client.get(download_url, headers=headers)

            if image_resp.status_code != 200:
                public_url = (
                    f"{base_supabase_url}/storage/v1/object/public/"
                    f"{SUPABASE_BUCKET}/{safe_object_key}"
                )
                image_resp = client.get(public_url)

            if image_resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"Could not download image. Status: {image_resp.status_code}, "
                        f"Response: {image_resp.text}"
                    ),
                )

    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Image fetch failed: {str(exc)}")

    log_event(
        action="VIEW_SAMPLE_IMAGE",
        endpoint_accessed=f"/api/samples/{sample_id}/image",
        user_id=current_user["user_id"],
        sample_id=None,
        new_value={
            "sample_id": sample_id,
            "image_path": image_path,
            "object_key": object_key,
        },
        ip_address=request.client.host if request.client else None,
    )

    return StreamingResponse(
        BytesIO(image_resp.content),
        media_type=image_resp.headers.get("content-type", "application/octet-stream"),
    )


# ============================================================
# QA QUEUES
# ============================================================

@router.get("/qa/pre-testing")
def qa_pre_testing_queue(
    current_user=Depends(require_roles(ROLE_QA, ROLE_ADMIN)),
):
    data = hydrate_samples_user_names(list_samples())
    output = []

    allowed_payment = {"Downpayment Paid", "PO Submitted", "Fully Paid"}

    for item in data:
        metadata = item.get("device_metadata") or {}
        payment = metadata.get("payment") or {}
        qa = metadata.get("qa") or {}

        if (
            item.get("current_state") == "Registered"
            and payment.get("payment_status") in allowed_payment
            and not qa.get("pre_testing_reviewed")
        ):
            output.append(item)

    return output


@router.get("/qa/release")
def qa_release_queue(
    current_user=Depends(require_roles(ROLE_QA, ROLE_ADMIN)),
):
    data = hydrate_samples_user_names(list_samples())
    output = []

    for item in data:
        metadata = item.get("device_metadata") or {}
        payment = metadata.get("payment") or {}

        if (
            item.get("current_state") == "For Review"
            and payment.get("payment_status") == "Fully Paid"
        ):
            output.append(item)

    return output


@router.patch("/samples/{sample_id}/qa-pretesting")
def qa_pretesting_review(
    sample_id: str,
    request: Request,
    current_user=Depends(require_roles(ROLE_QA, ROLE_ADMIN)),
):
    from ..database import execute

    item = get_sample(sample_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    if item.get("current_state") != "Registered":
        raise HTTPException(
            status_code=400,
            detail="Only Registered samples can be reviewed before testing",
        )

    metadata = item.get("device_metadata") or {}
    metadata["qa"] = metadata.get("qa") or {}
    metadata["qa"]["pre_testing_reviewed"] = True
    metadata["qa"]["pre_testing_reviewed_by"] = current_user["user_id"]
    metadata["qa"]["pre_testing_reviewed_at"] = datetime.now().isoformat()

    execute(
        """
        UPDATE samples
        SET device_metadata = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (json.dumps(metadata), sample_id),
    )

    log_event(
        action="QA_PRE_TESTING_REVIEW",
        endpoint_accessed=f"/api/samples/{sample_id}/qa-pretesting",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        new_value={"qa_pre_testing_reviewed": True},
        ip_address=request.client.host if request.client else None,
    )

    return hydrate_sample_user_names(get_sample(sample_id))


@router.patch("/samples/{sample_id}/qa-result-override")
def qa_result_override(
    sample_id: str,
    payload: dict,
    request: Request,
    current_user=Depends(require_roles(ROLE_QA, ROLE_ADMIN)),
):
    """
    QA/Engineer review endpoint.

    The system computes the initial result, but QA may override the final
    report result before release with a required justification.

    This preserves:
    - original system result
    - previous displayed result
    - QA final result
    - override reason
    - reviewer identity and timestamp
    """
    from ..database import execute

    item = get_sample(sample_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    if item.get("current_state") != "For Review":
        raise HTTPException(
            status_code=400,
            detail="QA result override is only allowed while the sample is For Review",
        )

    if item.get("is_immutable"):
        raise HTTPException(
            status_code=400,
            detail="Immutable records cannot be overridden",
        )

    metadata = item.get("device_metadata") or {}
    test_data = metadata.get("test_data")

    if not test_data:
        raise HTTPException(
            status_code=400,
            detail="Test data is required before QA result override",
        )

    override_result = payload.get("result")
    override_reason = (payload.get("reason") or "").strip()

    if override_result not in {RESULT_PASS, RESULT_FAIL, RESULT_RECORDED}:
        raise HTTPException(
            status_code=400,
            detail="result must be PASS, FAIL, or RECORDED",
        )

    if len(override_reason) < 10:
        raise HTTPException(
            status_code=400,
            detail="Override reason is required and must be at least 10 characters",
        )

    original_system_result = (
        test_data.get("system_result")
        or test_data.get("qa_override", {}).get("system_result")
        or test_data.get("result")
    )

    previous_result = test_data.get("result")

    test_data["system_result"] = original_system_result
    test_data["qa_final_result"] = override_result
    test_data["result"] = override_result
    test_data["qa_override"] = {
        "is_overridden": override_result != original_system_result,
        "system_result": original_system_result,
        "previous_result": previous_result,
        "override_result": override_result,
        "override_reason": override_reason,
        "overridden_by": current_user["user_id"],
        "overridden_by_role": current_user["role"],
        "overridden_at": datetime.now().isoformat(),
    }

    metadata["test_data"] = test_data
    metadata["qa"] = metadata.get("qa") or {}
    metadata["qa"]["result_reviewed"] = True
    metadata["qa"]["result_reviewed_by"] = current_user["user_id"]
    metadata["qa"]["result_reviewed_at"] = datetime.now().isoformat()

    execute(
        """
        UPDATE samples
        SET device_metadata = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (json.dumps(metadata), sample_id),
    )

    log_event(
        action="QA_RESULT_OVERRIDE",
        endpoint_accessed=f"/api/samples/{sample_id}/qa-result-override",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        new_value={
            "system_result": original_system_result,
            "previous_result": previous_result,
            "qa_final_result": override_result,
            "override_reason": override_reason,
        },
        ip_address=request.client.host if request.client else None,
    )

    return hydrate_sample_user_names(get_sample(sample_id))


@router.patch("/samples/{sample_id}/qa-release")
def qa_release_review(
    sample_id: str,
    request: Request,
    current_user=Depends(require_roles(ROLE_QA, ROLE_ADMIN)),
):
    from ..database import execute

    item = get_sample(sample_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    if item.get("current_state") != "For Review":
        raise HTTPException(status_code=400, detail="Only For Review samples can be released")

    metadata = item.get("device_metadata") or {}
    payment_status = metadata.get("payment", {}).get("payment_status")
    test_data = metadata.get("test_data")

    if payment_status != "Fully Paid" and current_user["role"] != ROLE_ADMIN:
        raise HTTPException(status_code=400, detail="Full payment is required before release")

    if not test_data and current_user["role"] != ROLE_ADMIN:
        raise HTTPException(status_code=400, detail="Test data is required before release")

    metadata["qa"] = metadata.get("qa") or {}
    metadata["qa"]["release_reviewed"] = True
    metadata["qa"]["release_reviewed_by"] = current_user["user_id"]
    metadata["qa"]["release_reviewed_at"] = datetime.now().isoformat()

    execute(
        """
        UPDATE samples
        SET status = %s,
            current_state = %s,
            is_immutable = %s,
            decision = %s,
            device_metadata = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (
            "Released",
            "Released",
            True,
            "Released",
            json.dumps(metadata),
            sample_id,
        ),
    )

    log_event(
        action="QA_RELEASE_REVIEW",
        endpoint_accessed=f"/api/samples/{sample_id}/qa-release",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        new_value={
            "status": "Released",
            "test_result": test_data.get("result") if test_data else None,
            "release_note": "Official report released with recorded test result.",
        },
        ip_address=request.client.host if request.client else None,
    )

    return hydrate_sample_user_names(get_sample(sample_id))


# ============================================================
# LAB TECH WORKFLOW
# ============================================================

@router.get("/lab-tech/workflow")
def lab_tech_workflow_queue(
    current_user=Depends(require_roles(ROLE_LAB_TECH, ROLE_ADMIN)),
):
    data = hydrate_samples_user_names(list_samples())
    ready_for_testing = []
    in_testing = []

    for item in data:
        metadata = item.get("device_metadata") or {}
        payment = metadata.get("payment") or {}
        qa = metadata.get("qa") or {}

        payment_status = payment.get("payment_status")

        if (
            item.get("current_state") == "Registered"
            and payment_status in {"Downpayment Paid", "PO Submitted", "Fully Paid"}
            and qa.get("pre_testing_reviewed")
        ):
            ready_for_testing.append(item)

        if item.get("current_state") == "In Testing":
            in_testing.append(item)

    return {
        "ready_for_testing": ready_for_testing,
        "in_testing": in_testing,
    }


# ============================================================
# SAMPLE DETAILS / REVIEWS / DASHBOARD
# ============================================================

@router.get("/samples/{sample_id}")
def sample_detail(
    sample_id: str,
    request: Request,
    current_user=Depends(
        require_roles(
            ROLE_LAB_TECH,
            ROLE_SENIOR_TECH,
            ROLE_QA,
            ROLE_ADMIN,
            ROLE_ACCOUNTING,
        )
    ),
):
    item = get_sample(sample_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    hydrated_item = hydrate_sample_user_names(item)

    log_event(
        action="VIEW_SAMPLE",
        endpoint_accessed=f"/api/samples/{sample_id}",
        user_id=current_user["user_id"],
        sample_id=None,
        new_value={"sample_id": sample_id},
        ip_address=request.client.host if request.client else None,
    )

    return hydrated_item


@router.get("/reviews")
def reviews(
    request: Request,
    current_user=Depends(
        require_roles(ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN)
    ),
):
    data = hydrate_samples_user_names(list_reviews())

    log_event(
        action="LIST_REVIEWS",
        endpoint_accessed="/api/reviews",
        user_id=current_user["user_id"],
        new_value={"count": len(data)},
        ip_address=request.client.host if request.client else None,
    )

    return data


@router.get("/dashboard")
def technical_dashboard(
    request: Request,
    current_user=Depends(
        require_roles(
            ROLE_LAB_TECH,
            ROLE_SENIOR_TECH,
            ROLE_QA,
            ROLE_ADMIN,
            ROLE_ACCOUNTING,
        )
    ),
):
    data = dashboard()

    if isinstance(data.get("recent_samples"), list):
        data["recent_samples"] = hydrate_samples_user_names(data["recent_samples"])

    log_event(
        action="VIEW_DASHBOARD",
        endpoint_accessed="/api/dashboard",
        user_id=current_user["user_id"],
        new_value={k: v for k, v in data.items() if k != "recent_samples"},
        ip_address=request.client.host if request.client else None,
    )

    return data


# ============================================================
# TEST DATA ENTRY
# System-computed PASS / FAIL / RECORDED
# ============================================================

@router.patch("/samples/{sample_id}/test-data")
def update_test_data(
    sample_id: str,
    payload: dict,
    request: Request,
    current_user=Depends(require_roles(ROLE_LAB_TECH, ROLE_ADMIN)),
):
    from ..database import execute

    item = get_sample(sample_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    if item.get("current_state") != "In Testing" and current_user["role"] != ROLE_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Test data can only be entered during In Testing",
        )

    test_type = payload.get("test_type")
    if not test_type:
        raise HTTPException(status_code=400, detail="test_type is required")

    evaluation = evaluate_standardized_test(test_type, payload)

    result = evaluation["result"]
    data = evaluation["data"]

    technician_remarks = payload.get("remarks") or ""

    metadata = item.get("device_metadata") or {}

    metadata["test_data"] = {
        "test_type": test_type,
        "values": data,
        "result": result,
        "system_remarks": evaluation["remarks"],
        "remarks": technician_remarks,
        "entered_by": current_user["user_id"],
        "entered_at": datetime.now().isoformat(),
        "computed_by_system": True,
    }

    next_state = "For Review"

    execute(
        """
        UPDATE samples
        SET device_metadata = %s,
            status = %s,
            current_state = %s,
            decision = %s,
            is_immutable = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (
            json.dumps(metadata),
            next_state,
            next_state,
            next_state,
            False,
            sample_id,
        ),
    )

    log_event(
        action="UPDATE_TEST_DATA",
        endpoint_accessed=f"/api/samples/{sample_id}/test-data",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        new_value={
            "test_data": metadata["test_data"],
            "auto_transition": {
                "from": item.get("current_state"),
                "to": next_state,
            },
        },
        ip_address=request.client.host if request.client else None,
    )

    return hydrate_sample_user_names(get_sample(sample_id))


# ============================================================
# SAMPLE STATUS UPDATE
# ============================================================

@router.patch("/samples/{sample_id}/status")
def update_sample_status(
    sample_id: str,
    payload: dict,
    request: Request,
    current_user=Depends(
        require_roles(
            ROLE_LAB_TECH,
            ROLE_SENIOR_TECH,
            ROLE_QA,
            ROLE_ADMIN,
            ROLE_ACCOUNTING,
        )
    ),
):
    item = get_sample(sample_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    new_state = payload.get("status")
    if new_state not in {"Registered", "In Testing", "For Review", "Released", "Archived"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    current_state = item.get("current_state")
    role = current_user["role"]
    metadata = item.get("device_metadata") or {}
    payment = metadata.get("payment") or {}
    payment_status = payment.get("payment_status")
    test_data = metadata.get("test_data")

    allowed_initial_payment = {"Downpayment Paid", "PO Submitted", "Fully Paid"}

    if current_state == "Archived":
        raise HTTPException(status_code=400, detail="Archived samples cannot be modified")

    if new_state == "In Testing":
        if role not in {ROLE_LAB_TECH, ROLE_ADMIN}:
            raise HTTPException(status_code=403, detail="Only Lab Technicians can start testing")

        if current_state != "Registered":
            raise HTTPException(status_code=400, detail="Only Registered samples can move to In Testing")

        if payment_status not in allowed_initial_payment and role != ROLE_ADMIN:
            raise HTTPException(
                status_code=400,
                detail="Initial payment or purchase order is required before testing",
            )

        qa = metadata.get("qa") or {}

        if not qa.get("pre_testing_reviewed") and role != ROLE_ADMIN:
            raise HTTPException(
                status_code=400,
                detail="QA pre-testing review is required before testing",
            )

    elif new_state == "For Review":
        if role not in {ROLE_SENIOR_TECH, ROLE_ADMIN}:
            raise HTTPException(status_code=403, detail="Only Senior Technicians can submit for review")

        if current_state != "In Testing":
            raise HTTPException(status_code=400, detail="Only In Testing samples can move to For Review")

        if not test_data and role != ROLE_ADMIN:
            raise HTTPException(status_code=400, detail="Test data is required before review")

    elif new_state == "Released":
        if role not in {ROLE_QA, ROLE_ADMIN}:
            raise HTTPException(status_code=403, detail="Only QA Engineers can release samples")

        if current_state != "For Review" and role != ROLE_ADMIN:
            raise HTTPException(status_code=400, detail="Only For Review samples can be released")

        if payment_status != "Fully Paid" and role != ROLE_ADMIN:
            raise HTTPException(
                status_code=400,
                detail="Full payment is required before releasing official reports",
            )

        if not test_data and role != ROLE_ADMIN:
            raise HTTPException(status_code=400, detail="Test data is required before release")

        metadata["qa"] = metadata.get("qa") or {}
        metadata["qa"]["release_reviewed"] = True
        metadata["qa"]["release_reviewed_by"] = current_user["user_id"]
        metadata["qa"]["release_reviewed_at"] = datetime.now().isoformat()

    elif new_state == "Archived":
        if role not in {ROLE_QA, ROLE_ADMIN}:
            raise HTTPException(status_code=403, detail="Only QA or Admin can archive samples")

        if current_state != "Released":
            raise HTTPException(status_code=400, detail="Only Released samples can be archived")

    elif new_state == "Registered":
        if role != ROLE_ADMIN:
            raise HTTPException(status_code=403, detail="Only Admin can move samples back to Registered")

    from ..database import execute

    is_immutable = new_state in {"Released", "Archived"}

    execute(
        """
        UPDATE samples
        SET
            status = %s,
            current_state = %s,
            is_immutable = %s,
            decision = %s,
            device_metadata = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (
            new_state,
            new_state,
            is_immutable,
            new_state,
            json.dumps(metadata),
            sample_id,
        ),
    )

    updated = hydrate_sample_user_names(get_sample(sample_id))

    log_event(
        action="UPDATE_SAMPLE_STATUS",
        endpoint_accessed=f"/api/samples/{sample_id}/status",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        new_value={
            "from": current_state,
            "to": new_state,
            "payment_status": payment_status,
            "test_result": test_data.get("result") if test_data else None,
            "release_note": "Official report may be released with PASS, FAIL, or RECORDED result."
            if new_state == "Released"
            else None,
        },
        ip_address=request.client.host if request.client else None,
    )

    return updated