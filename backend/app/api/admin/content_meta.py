from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.bible import Book, BibleTranslation

router = APIRouter(prefix="/content-meta", tags=["Admin Content Metadata"])

@router.get("/books")
def list_books(
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    books = db.query(Book).order_by(Book.number.asc()).all()
    return {
        "success": True,
        "data": [
            {
                "id": b.id,
                "number": b.number,
                "name": b.name,
                "testament": b.testament,
                "chapters_count": b.chapters_count,
                "language": b.language
            }
            for b in books
        ]
    }

@router.get("/translations")
def list_translations(
    admin = Depends(require_permission("content.read")),
    db: Session = Depends(get_db)
):
    trans = db.query(BibleTranslation).all()
    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "name": t.name,
                "language": t.language,
                "is_public_domain": t.is_public_domain,
                "is_default": t.is_default,
                "is_active": t.is_active
            }
            for t in trans
        ]
    }
