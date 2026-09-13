from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, JSON, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class BibleTranslation(Base, TimestampMixin):
    __tablename__ = "bible_translations"

    id = Column(String(20), primary_key=True)  # "NVI", "ACF", "ARA", "KJV"
    name = Column(String(100), nullable=False)
    language = Column(String(10), default="pt-BR", nullable=False)
    is_public_domain = Column(Boolean, default=False, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    verses = relationship("Verse", back_populates="translation_rel")

class Book(Base):
    __tablename__ = "books"

    id = Column(String(10), primary_key=True)  # "GEN", "PSA", "JHN", etc.
    number = Column(Integer, nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    testament = Column(String(10), nullable=False)  # "OT", "NT"
    chapters_count = Column(Integer, nullable=False)
    language = Column(String(10), default="pt-BR", nullable=False)

    verses = relationship("Verse", back_populates="book_rel")

class VerseTheme(Base):
    __tablename__ = "verse_themes"

    verse_id = Column(String(36), ForeignKey("verses.id", ondelete="CASCADE"), primary_key=True)
    theme_id = Column(String(50), ForeignKey("themes.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class VerseEmotion(Base):
    __tablename__ = "verse_emotions"

    verse_id = Column(String(36), ForeignKey("verses.id", ondelete="CASCADE"), primary_key=True)
    emotion_id = Column(String(50), ForeignKey("emotions.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class Verse(Base, TimestampMixin):
    __tablename__ = "verses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    book_id = Column(String(10), ForeignKey("books.id", ondelete="RESTRICT"), nullable=False, index=True)
    translation = Column(String(20), ForeignKey("bible_translations.id", ondelete="RESTRICT"), default="NVI", nullable=False, index=True)
    chapter = Column(Integer, nullable=False, index=True)
    verse_number = Column(Integer, nullable=False, index=True)
    reference = Column(String(100), nullable=False, index=True)  # e.g., "Salmos 23:1"
    text = Column(Text, nullable=False)
    language = Column(String(10), default="pt-BR", nullable=False)
    status = Column(String(20), default="published", nullable=False, index=True)  # "draft", "published", "archived"
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)

    book_rel = relationship("Book", back_populates="verses")
    translation_rel = relationship("BibleTranslation", back_populates="verses")
    themes = relationship("Theme", secondary="verse_themes", back_populates="verses")
    emotions = relationship("Emotion", secondary="verse_emotions", back_populates="verses")
    daily_verses = relationship("DailyVerse", back_populates="verse")
    reflections = relationship("Reflection", back_populates="verse")

class Theme(Base, TimestampMixin):
    __tablename__ = "themes"

    id = Column(String(50), primary_key=True)  # e.g., "paz", "fe", "gratidao"
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    icon_name = Column(String(50), default="Faith", nullable=False)
    color_hex = Column(String(20), default="#D4AF37", nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="published", nullable=False)
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)

    verses = relationship("Verse", secondary="verse_themes", back_populates="themes")

class Emotion(Base, TimestampMixin):
    __tablename__ = "emotions"

    id = Column(String(50), primary_key=True)  # e.g., "ansioso", "triste", "agradecido"
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    icon_name = Column(String(50), default="Smile", nullable=False)
    color_hex = Column(String(20), default="#4A90E2", nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="published", nullable=False)
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)

    verses = relationship("Verse", secondary="verse_emotions", back_populates="emotions")

class Reflection(Base, TimestampMixin):
    __tablename__ = "reflections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    verse_id = Column(String(36), ForeignKey("verses.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    prayer = Column(Text, nullable=True)
    author = Column(String(100), default="Equipe Editorial", nullable=False)
    language = Column(String(10), default="pt-BR", nullable=False)
    status = Column(String(20), default="published", nullable=False)
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)

    verse = relationship("Verse", back_populates="reflections")

class DailyVerse(Base, TimestampMixin):
    __tablename__ = "daily_verses"
    __table_args__ = (UniqueConstraint('target_date', 'app_id', name='uq_daily_verse_date_app'),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    target_date = Column(Date, nullable=False, index=True)
    verse_id = Column(String(36), ForeignKey("verses.id", ondelete="CASCADE"), nullable=False, index=True)
    reflection_title = Column(String(200), nullable=True)
    reflection_text = Column(Text, nullable=True)
    prayer_text = Column(Text, nullable=True)
    theme_id = Column(String(50), ForeignKey("themes.id", ondelete="SET NULL"), nullable=True)
    background_image_url = Column(String(500), nullable=True)
    status = Column(String(20), default="scheduled", nullable=False)  # "scheduled", "active", "archived"
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)

    verse = relationship("Verse", back_populates="daily_verses")
    theme = relationship("Theme")

class Devotional(Base, TimestampMixin):
    __tablename__ = "devotionals"

    id = Column(String(50), primary_key=True)  # e.g., "paz-na-tempestade"
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    cover_image_url = Column(String(500), nullable=True)
    total_days = Column(Integer, default=7, nullable=False)
    is_premium = Column(Boolean, default=False, nullable=False)
    language = Column(String(10), default="pt-BR", nullable=False)
    status = Column(String(20), default="published", nullable=False)  # "draft", "published", "scheduled", "archived"
    publication_date = Column(DateTime, default=utc_now, nullable=False)
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)

    days = relationship("DevotionalDay", back_populates="devotional", cascade="all, delete-orphan", order_by="DevotionalDay.day_number")

class DevotionalDay(Base, TimestampMixin):
    __tablename__ = "devotional_days"
    __table_args__ = (UniqueConstraint('devotional_id', 'day_number', name='uq_devotional_day_number'),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    devotional_id = Column(String(50), ForeignKey("devotionals.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    verse_reference = Column(String(100), nullable=False)
    verse_text = Column(Text, nullable=False)
    reflection = Column(Text, nullable=False)
    prayer = Column(Text, nullable=True)
    reading_passage = Column(String(100), nullable=True)

    devotional = relationship("Devotional", back_populates="days")

class DevotionalProgress(Base, TimestampMixin):
    __tablename__ = "devotional_progress"
    __table_args__ = (UniqueConstraint('user_id', 'devotional_id', name='uq_user_devotional_progress'),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    devotional_id = Column(String(50), ForeignKey("devotionals.id", ondelete="CASCADE"), nullable=False, index=True)
    current_day = Column(Integer, default=1, nullable=False)
    completed_days = Column(JSON, default=list, nullable=False)  # [1, 2, 3]
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
