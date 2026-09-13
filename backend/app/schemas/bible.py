from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

class TranslationResponse(BaseModel):
    id: str
    name: str
    language: str
    is_public_domain: bool
    is_default: bool
    is_active: bool

class BookResponse(BaseModel):
    id: str
    number: int
    name: str
    testament: str
    chapters_count: int
    language: str

class ThemeCreate(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon_name: str = "Faith"
    color_hex: str = "#D4AF37"
    sort_order: int = 0
    status: str = "published"
    app_id: str = "verse_daily"

class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon_name: Optional[str] = None
    color_hex: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[str] = None

class ThemeResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon_name: str
    color_hex: str
    sort_order: int
    status: str
    app_id: str
    verses_count: int = 0

class EmotionCreate(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon_name: str = "Smile"
    color_hex: str = "#4A90E2"
    sort_order: int = 0
    status: str = "published"
    app_id: str = "verse_daily"

class EmotionUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon_name: Optional[str] = None
    color_hex: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[str] = None

class EmotionResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon_name: str
    color_hex: str
    sort_order: int
    status: str
    app_id: str
    verses_count: int = 0

class VerseCreate(BaseModel):
    book_id: str
    translation: str = "NVI"
    chapter: int
    verse_number: int
    reference: str
    text: str
    language: str = "pt-BR"
    status: str = "published"
    app_id: str = "verse_daily"
    theme_ids: List[str] = []
    emotion_ids: List[str] = []

class VerseUpdate(BaseModel):
    book_id: Optional[str] = None
    translation: Optional[str] = None
    chapter: Optional[int] = None
    verse_number: Optional[int] = None
    reference: Optional[str] = None
    text: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    theme_ids: Optional[List[str]] = None
    emotion_ids: Optional[List[str]] = None

class VerseResponse(BaseModel):
    id: str
    book_id: str
    translation: str
    chapter: int
    verse_number: int
    reference: str
    text: str
    language: str
    status: str
    app_id: str
    themes: List[str] = []
    emotions: List[str] = []
    created_at: datetime
    updated_at: datetime

class DailyVerseCreate(BaseModel):
    target_date: date
    verse_id: str
    reflection_title: Optional[str] = None
    reflection_text: Optional[str] = None
    prayer_text: Optional[str] = None
    theme_id: Optional[str] = None
    background_image_url: Optional[str] = None
    status: str = "scheduled"
    app_id: str = "verse_daily"

class DailyVerseUpdate(BaseModel):
    verse_id: Optional[str] = None
    reflection_title: Optional[str] = None
    reflection_text: Optional[str] = None
    prayer_text: Optional[str] = None
    theme_id: Optional[str] = None
    background_image_url: Optional[str] = None
    status: Optional[str] = None

class DailyVerseResponse(BaseModel):
    id: str
    target_date: date
    verse_id: str
    reference: str
    verse_text: str
    translation: str
    reflection_title: Optional[str] = None
    reflection_text: Optional[str] = None
    prayer_text: Optional[str] = None
    theme_id: Optional[str] = None
    theme_name: Optional[str] = None
    background_image_url: Optional[str] = None
    status: str
    app_id: str

class ReflectionCreate(BaseModel):
    verse_id: Optional[str] = None
    title: str
    content: str
    prayer: Optional[str] = None
    author: str = "Equipe Editorial"
    language: str = "pt-BR"
    status: str = "published"
    app_id: str = "verse_daily"

class ReflectionUpdate(BaseModel):
    verse_id: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    prayer: Optional[str] = None
    author: Optional[str] = None
    status: Optional[str] = None

class ReflectionResponse(BaseModel):
    id: str
    verse_id: Optional[str] = None
    verse_reference: Optional[str] = None
    title: str
    content: str
    prayer: Optional[str] = None
    author: str
    language: str
    status: str
    app_id: str
    created_at: datetime

class DevotionalDayCreate(BaseModel):
    day_number: int
    title: str
    verse_reference: str
    verse_text: str
    reflection: str
    prayer: Optional[str] = None
    reading_passage: Optional[str] = None

class DevotionalDayResponse(BaseModel):
    id: str
    day_number: int
    title: str
    verse_reference: str
    verse_text: str
    reflection: str
    prayer: Optional[str] = None
    reading_passage: Optional[str] = None

class DevotionalCreate(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    cover_image_url: Optional[str] = None
    total_days: int = 7
    is_premium: bool = False
    language: str = "pt-BR"
    status: str = "published"
    app_id: str = "verse_daily"
    days: List[DevotionalDayCreate] = []

class DevotionalUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    total_days: Optional[int] = None
    is_premium: Optional[bool] = None
    status: Optional[str] = None
    days: Optional[List[DevotionalDayCreate]] = None

class DevotionalResponse(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    cover_image_url: Optional[str] = None
    total_days: int
    is_premium: bool
    language: str
    status: str
    publication_date: datetime
    app_id: str
    days: List[DevotionalDayResponse] = []
