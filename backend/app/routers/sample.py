from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from urllib.parse import urlparse
from io import BytesIO
import hashlib
import httpx
from urllib.parse import urlparse, quote

import json
from datetime import datetime

from ..config import ROLE_ACCOUNTING, ROLE_ADMIN, ROLE_QA, ROLE_SENIOR_TECH, ROLE_LAB_TECH
from ..config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET
from ..schemas import SampleRegistrationRequest
from ..services.audit_service import log_event
from ..services.auth_service import require_roles
from ..services.sample_service import create_sample_only, dashboard, get_sample, list_reviews, list_samples

router = APIRouter(prefix="/api", tags=["Samples"])


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
    immutable = False

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
        is_immutable=immutable,
        ai_predicted_label=ai_predicted_label,
        confidence_score=float(payload.ai_confidence_score or 0.0),
        decision=db_decision,
        model_version=payload.model_version,
        device_metadata=payload.device_metadata or {},
        original_filename=payload.image_path.split("/")[-1] if payload.image_path else None,
        image_sha256=hashlib.sha256(payload.image_path.encode("utf-8")).hexdigest() if payload.image_path else None,
        notes=None,
    )

    sample = get_sample(sample["sample_id"])

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
        require_roles(ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN, ROLE_ACCOUNTING)
    ),
):
    data = list_samples()
    log_event(
        action="LIST_SAMPLES",
        endpoint_accessed="/api/samples",
        user_id=current_user["user_id"],
        new_value={"count": len(data)},
        ip_address=request.client.host if request.client else None,
    )
    return data


# NOTE: must be defined BEFORE /samples/{sample_id} to avoid route conflict
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

    # Safely strip any trailing slash from the base URL to prevent double slashes
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

    # Clean up any leftover leading/trailing slashes
    object_key = object_key.strip("/")

    if not object_key:
        raise HTTPException(status_code=400, detail=f"Invalid stored image_path: {image_path}")

    # CRITICAL FIX: URL-encode the object key to handle spaces and special characters safely
    safe_object_key = quote(object_key)

    # OPTIMIZATION: Skip generating a signed URL entirely. 
    # Directly download the image using the service key and stream it back.
    download_url = f"{base_supabase_url}/storage/v1/object/authenticated/{SUPABASE_BUCKET}/{safe_object_key}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
    }

    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            image_resp = client.get(download_url, headers=headers)

            # Fallback: If the bucket is explicitly public, the authenticated endpoint might sometimes reject it.
            if image_resp.status_code != 200:
                public_url = f"{base_supabase_url}/storage/v1/object/public/{SUPABASE_BUCKET}/{safe_object_key}"
                image_resp = client.get(public_url)

            if image_resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Could not download image. Status: {image_resp.status_code}, Response: {image_resp.text}"
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

@router.get("/qa/pre-testing")
def qa_pre_testing_queue(
    current_user=Depends(require_roles(ROLE_QA, ROLE_ADMIN)),
):
    data = list_samples()

    allowed_payment = {
        "Downpayment Paid",
        "PO Submitted",
        "Fully Paid",
    }

    output = []

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
    data = list_samples()
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
        raise HTTPException(status_code=400, detail="Only Registered samples can be reviewed before testing")

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

    return get_sample(sample_id)


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

    if payment_status != "Fully Paid" and current_user["role"] != ROLE_ADMIN:
        raise HTTPException(status_code=400, detail="Full payment is required before release")

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
        new_value={"status": "Released"},
        ip_address=request.client.host if request.client else None,
    )

    return get_sample(sample_id)

@router.get("/samples/{sample_id}")
def sample_detail(
    sample_id: str,
    request: Request,
    current_user=Depends(
        require_roles(ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN, ROLE_ACCOUNTING)
    ),
):
    item = get_sample(sample_id)
    if not item:
        raise HTTPException(status_code=404, detail="Sample not found")

    log_event(
        action="VIEW_SAMPLE",
        endpoint_accessed=f"/api/samples/{sample_id}",
        user_id=current_user["user_id"],
        sample_id=None,
        new_value={"sample_id": sample_id},
        ip_address=request.client.host if request.client else None,
    )
    return item


@router.get("/reviews")
def reviews(
    request: Request,
    current_user=Depends(require_roles(ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN)),
):
    data = list_reviews()
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
        require_roles(ROLE_LAB_TECH, ROLE_SENIOR_TECH, ROLE_QA, ROLE_ADMIN, ROLE_ACCOUNTING)
    ),
):
    data = dashboard()
    log_event(
        action="VIEW_DASHBOARD",
        endpoint_accessed="/api/dashboard",
        user_id=current_user["user_id"],
        new_value={k: v for k, v in data.items() if k != "recent_samples"},
        ip_address=request.client.host if request.client else None,
    )
    return data

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

    allowed_initial_payment = {
        "Downpayment Paid",
        "PO Submitted",
        "Fully Paid",
    }

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
            updated_at = CURRENT_TIMESTAMP
        WHERE sample_id = %s
        """,
        (
            new_state,
            new_state,
            is_immutable,
            new_state,
            sample_id,
        ),
    )

    updated = get_sample(sample_id)

    log_event(
        action="UPDATE_SAMPLE_STATUS",
        endpoint_accessed=f"/api/samples/{sample_id}/status",
        user_id=current_user["user_id"],
        sample_id=sample_id,
        new_value={
            "from": current_state,
            "to": new_state,
            "payment_status": payment_status,
        },
        ip_address=request.client.host if request.client else None,
    )

    return updated