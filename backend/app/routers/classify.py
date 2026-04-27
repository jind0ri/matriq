import json
import hashlib
import uuid
from io import BytesIO
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

from ..config import (
    CLASSIFY_ROLES,
    ROLE_ADMIN,
    ROLE_QA,
    ROLE_SENIOR_TECH,
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    SUPABASE_BUCKET,
)
from ..services.audit_service import log_event
from ..services.auth_service import require_roles
from ..services.model_service import active_model, predict, thresholds, validate_image_bytes
from ..services.notification_service import notify_role_for_branch
from ..services.sample_service import create_sample_with_inference, get_review_by_sample_id

router = APIRouter(prefix="/api", tags=["Classification"])


def is_admin_user(current_user):
    return current_user.get("role") == ROLE_ADMIN


def get_assigned_branch_id(current_user):
    branch_id = current_user.get("branch_id")

    if branch_id is None or branch_id == "":
        raise HTTPException(
            status_code=403,
            detail="Your account has no assigned branch.",
        )

    return int(branch_id)


def resolve_write_branch_id(requested_branch_id, current_user):
    """
    Write-lock rule:
    - Admin can create records for any branch.
    - Non-admin users can only create records for their assigned branch.
    """
    if is_admin_user(current_user):
        if requested_branch_id is None or requested_branch_id == "":
            raise HTTPException(status_code=400, detail="branch_id is required.")
        return int(requested_branch_id)

    assigned_branch_id = get_assigned_branch_id(current_user)

    if requested_branch_id is not None and requested_branch_id != "":
        if int(requested_branch_id) != assigned_branch_id:
            raise HTTPException(
                status_code=403,
                detail="You can only create records for your assigned branch.",
            )

    return assigned_branch_id


def upload_to_supabase(raw: bytes, filename: str, content_type: str) -> str:
    ext = Path(filename).suffix or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"uploads/{unique_name}"

    url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{unique_name}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": content_type or "image/jpeg",
    }

    response = httpx.put(url, content=raw, headers=headers)

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image to storage: {response.text}",
        )

    return storage_path


@router.post("/classify")
async def classify(
    request: Request,
    image: UploadFile = File(...),
    client_name: str = Form(...),
    project_id: str = Form(...),
    branch_id: int = Form(...),
    device_metadata: str = Form("{}"),
    current_user=Depends(require_roles(*CLASSIFY_ROLES)),
):
    if not client_name.strip() or not project_id.strip():
        raise HTTPException(
            status_code=400,
            detail="client_name and project_id are required.",
        )

    model_meta = active_model()

    if not Path(model_meta["resolved_artifact_path"]).exists():
        raise HTTPException(
            status_code=503,
            detail="Active model artifact is unavailable.",
        )

    raw = await image.read()

    try:
        pil = Image.open(BytesIO(raw)).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        log_event(
            action="CLASSIFICATION_REJECTED",
            endpoint_accessed="/api/classify",
            user_id=current_user["user_id"],
            new_value={"reason": "corrupt_image"},
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is corrupt or unreadable.",
        )

    try:
        image_validation = validate_image_bytes(image.filename, raw, pil)
    except ValueError as exc:
        log_event(
            action="CLASSIFICATION_REJECTED",
            endpoint_accessed="/api/classify",
            user_id=current_user["user_id"],
            new_value={"reason": str(exc)},
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        metadata = json.loads(device_metadata or "{}")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="device_metadata must be valid JSON.",
        )

    write_branch_id = resolve_write_branch_id(branch_id, current_user)

    try:
        result = predict(pil)
    except Exception as exc:
        log_event(
            action="CLASSIFICATION_FAILED",
            endpoint_accessed="/api/classify",
            user_id=current_user["user_id"],
            new_value={"reason": str(exc)},
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(status_code=500, detail="Inference failed.")

    content_type = image.content_type or "image/jpeg"
    image_path = upload_to_supabase(raw, image.filename or "sample.jpg", content_type)

    thr = thresholds()
    confidence = result["confidence_score"]

    if confidence >= thr["auto_accept_threshold"] and not result["out_of_scope"]:
        decision_api = "AUTO_ACCEPTED"
        decision_db = "Auto-Accepted"
        state = "Registered"
        immutable = True
        next_action = {"auto_registered": True, "endpoint": "/api/samples"}
    else:
        decision_api = (
            "MANDATORY_OVERRIDE"
            if confidence < thr["manual_review_threshold"]
            else "MANUAL_REVIEW_QUEUE"
        )
        decision_db = "Manual-Review"
        state = "For Review"
        immutable = False
        next_action = {
            "auto_registered": False,
            "endpoint": "/api/validate"
            if decision_api == "MANDATORY_OVERRIDE"
            else "/api/reviews",
        }

    enriched_metadata = {
        **metadata,
        **image_validation,
        **result["preprocessing"],
        "provider": result.get("provider"),
    }

    try:
        stored_sample = create_sample_with_inference(
            client_name=client_name.strip(),
            project_reference=project_id.strip(),
            predicted_label_db=result["predicted_label_db"],
            current_state=state,
            branch_id=write_branch_id,
            registered_by=current_user["user_id"],
            registered_by_role=current_user["role"],
            image_path=image_path,
            is_immutable=immutable,
            ai_predicted_label_db=result["predicted_label_db"],
            confidence_score=confidence,
            decision_db=decision_db,
            model_version=model_meta["version_number"],
            version_id=result.get("version_id"),
            device_metadata=enriched_metadata,
            original_filename=image.filename,
            image_sha256=hashlib.sha256(raw).hexdigest(),
            user_id_for_audit=current_user["user_id"],
        )
    except ValueError as exc:
        log_event(
            action="CLASSIFICATION_DUPLICATE_REJECTED",
            endpoint_accessed="/api/classify",
            user_id=current_user["user_id"],
            new_value={
                "reason": str(exc),
                "client_name": client_name.strip(),
                "project_id": project_id.strip(),
                "predicted_label": result["predicted_label_db"],
                "branch_id": write_branch_id,
            },
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(status_code=409, detail=str(exc))

    review = (
        get_review_by_sample_id(stored_sample["sample_id"])
        if decision_db == "Manual-Review"
        else None
    )
    
    payment = enriched_metadata.get("payment") or {}
    payment_status = payment.get("payment_status") or "Unpaid"

    allowed_initial_payment = {"Downpayment Paid", "PO Submitted", "Fully Paid"}

    if decision_db == "Manual-Review":
        notify_role_for_branch(
            role=ROLE_SENIOR_TECH,
            branch_id=stored_sample.get("branch_id"),
            sample_id=stored_sample.get("sample_id"),
            title="Sample Needs AI Classification Review",
            message=(
                f"Sample {stored_sample.get('sample_id')} has low AI confidence "
                "and needs Senior Technician validation."
            ),
            action_path="/technical/workflow",
            created_by=current_user["user_id"],
        )

    if (
        decision_api == "AUTO_ACCEPTED"
        and stored_sample.get("current_state") == "Registered"
        and payment_status in allowed_initial_payment
    ):
        notify_role_for_branch(
            role=ROLE_QA,
            branch_id=stored_sample.get("branch_id"),
            sample_id=stored_sample.get("sample_id"),
            title="Sample Ready for QA Pre-Testing",
            message=(
                f"Sample {stored_sample.get('sample_id')} has payment clearance "
                "for testing and is ready for QA pre-testing approval."
            ),
            action_path="/technical/workflow",
            created_by=current_user["user_id"],
        )
    
    log_event(
        action="CLASSIFICATION_SUCCESS",
        endpoint_accessed="/api/classify",
        user_id=current_user["user_id"],
        sample_id=None,
        new_value={
            "sample_id": stored_sample["sample_id"],
            "model_version": model_meta["version_number"],
            "version_id": result.get("version_id"),
            "predicted_label": result["predicted_label_db"],
            "confidence_score": confidence,
            "decision": decision_db,
            "out_of_scope": result["out_of_scope"],
            "branch_id": write_branch_id,
        },
        ip_address=request.client.host if request.client else None,
    )

    return {
        "success": True,
        "classification": {
            "predicted_label": result["predicted_label"],
            "predicted_label_db": result["predicted_label_db"],
            "confidence_score": confidence,
            "model_version": model_meta["version_number"],
            "decision": decision_api,
            "out_of_scope": result["out_of_scope"],
            "sample_registration": stored_sample
            if decision_api == "AUTO_ACCEPTED"
            else {
                "sample_id": stored_sample["sample_id"],
                "current_state": stored_sample["current_state"],
            },
            "manual_review_queue": review,
            "device_metadata": enriched_metadata,
            "thresholds": {
                "auto_accept_threshold": thr["auto_accept_threshold"],
                "manual_review_threshold": thr["manual_review_threshold"],
                "validated_model_version": thr["model_version"],
            },
            "next_action": next_action,
        },
    }