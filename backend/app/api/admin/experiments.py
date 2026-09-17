from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.experiment import Experiment, ExperimentVariant
from app.schemas.experiment import ExperimentCreate, ExperimentUpdate
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/experiments", tags=["Admin A/B Experiments"])

@router.get("")
def list_experiments(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("experiments.read")),
    db: Session = Depends(get_db)
):
    experiments = db.query(Experiment).options(
        joinedload(Experiment.variants)
    ).filter(Experiment.app_id == app_id).all()

    return {
        "success": True,
        "data": [
            {
                "id": exp.id,
                "app_id": exp.app_id,
                "name": exp.name,
                "description": exp.description,
                "status": exp.status,
                "start_date": exp.start_date.isoformat() if exp.start_date else None,
                "end_date": exp.end_date.isoformat() if exp.end_date else None,
                "target_metric": exp.target_metric,
                "variants": [
                    {
                        "id": v.id,
                        "key": v.key,
                        "name": v.name,
                        "traffic_percentage": v.traffic_percentage,
                        "config_json": v.config_json,
                        "impressions_count": v.impressions_count,
                        "conversions_count": v.conversions_count,
                        "conversion_rate_pct": round((v.conversions_count / v.impressions_count * 100.0), 2) if v.impressions_count > 0 else 0.0
                    }
                    for v in exp.variants
                ],
                "created_at": exp.created_at.isoformat()
            }
            for exp in experiments
        ]
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_experiment(
    body: ExperimentCreate,
    request: Request,
    admin = Depends(require_permission("experiments.write")),
    db: Session = Depends(get_db)
):
    existing = db.query(Experiment).filter(Experiment.id == body.id).first()
    if existing:
        raise ConflictException(f"Experimento '{body.id}' já existe")

    exp = Experiment(
        id=body.id,
        app_id=body.app_id,
        name=body.name,
        description=body.description,
        status="draft",
        target_metric=body.target_metric
    )
    db.add(exp)
    db.flush()

    for v in body.variants:
        variant = ExperimentVariant(
            experiment_id=exp.id,
            key=v.key,
            name=v.name,
            traffic_percentage=v.traffic_percentage,
            config_json=v.config_json
        )
        db.add(variant)

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="experiment_created",
        resource_type="experiment",
        resource_id=exp.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": exp.name}
    )

    return {"success": True, "data": {"id": exp.id, "name": exp.name}}

@router.put("/{experiment_id}/status")
def toggle_experiment_status(
    experiment_id: str,
    status_str: str,
    request: Request,
    admin = Depends(require_permission("experiments.write")),
    db: Session = Depends(get_db)
):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise NotFoundException("Experimento não encontrado")

    exp.status = status_str
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="experiment_status_changed",
        resource_type="experiment",
        resource_id=exp.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": exp.name, "new_status": status_str}
    )

    return {"success": True, "message": f"Status do experimento alterado para {status_str}"}
