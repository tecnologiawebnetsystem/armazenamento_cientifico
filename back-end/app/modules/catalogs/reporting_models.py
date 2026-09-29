from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReportType(Base):
    __tablename__ = "report_types"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    code: Mapped[str] = mapped_column("code", String(60), unique=True, nullable=False)
    name: Mapped[str] = mapped_column("name", String(120), nullable=False)
    description: Mapped[str] = mapped_column("description", Text, default="", nullable=False)
    formats: Mapped[str] = mapped_column("formats", Text, default="csv", nullable=False)
    active: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class ReportField(Base):
    __tablename__ = "report_fields"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    report_code: Mapped[str] = mapped_column(String(60), ForeignKey("report_types.code", ondelete="CASCADE"), nullable=False, index=True)
    field_key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    source_key: Mapped[str] = mapped_column(String(160), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
