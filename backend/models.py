from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class DimDate(Base):
    __tablename__ = "DIM_DATE"

    date_key = Column(Integer, primary_key=True)
    full_date = Column(String, nullable=False)
    day = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    month_name = Column(String, nullable=False)
    quarter = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    week = Column(Integer)
    day_of_week = Column(String, nullable=False)
    is_weekend = Column(Integer, default=0)

    facts = relationship("FactPost", back_populates="date_dim")

class DimBrand(Base):
    __tablename__ = "DIM_BRAND"

    brand_key = Column(Integer, primary_key=True)
    brand_name = Column(String, nullable=False)
    normalized_brand = Column(String, nullable=False)
    parent_company = Column(String)
    industry = Column(String, nullable=False)

    facts = relationship("FactPost", back_populates="brand_dim")

class DimSentiment(Base):
    __tablename__ = "DIM_SENTIMENT"

    sentiment_key = Column(Integer, primary_key=True)
    sentiment_label = Column(String, nullable=False)
    sentiment_score_type = Column(String, nullable=False)
    sentiment_score = Column(Integer, nullable=True)

    facts = relationship("FactPost", foreign_keys="FactPost.sentiment_key", back_populates="sentiment_dim")

class DimLocation(Base):
    __tablename__ = "DIM_LOCATION"

    location_key = Column(Integer, primary_key=True)
    location_text = Column(String, nullable=False)
    city = Column(String)
    state = Column(String)
    country = Column(String)
    timezone = Column(String)

    facts = relationship("FactPost", back_populates="location_dim")

class DimSource(Base):
    __tablename__ = "DIM_SOURCE"

    source_key = Column(Integer, primary_key=True)
    source_name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)

    facts = relationship("FactPost", back_populates="source_dim")

class DimNegativeReason(Base):
    __tablename__ = "DIM_NEGATIVE_REASON"

    negative_reason_key = Column(Integer, primary_key=True)
    reason = Column(String, nullable=False)

    facts = relationship("FactPost", back_populates="negative_reason_dim")

class FactPost(Base):
    __tablename__ = "FACT_POST"

    post_key = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(String)
    date_key = Column(Integer, ForeignKey("DIM_DATE.date_key"), nullable=False)
    brand_key = Column(Integer, ForeignKey("DIM_BRAND.brand_key"), nullable=False)
    sentiment_key = Column(Integer, ForeignKey("DIM_SENTIMENT.sentiment_key"), nullable=False)
    predicted_sentiment_key = Column(Integer, ForeignKey("DIM_SENTIMENT.sentiment_key"))
    location_key = Column(Integer, ForeignKey("DIM_LOCATION.location_key"), nullable=False)
    source_key = Column(Integer, ForeignKey("DIM_SOURCE.source_key"), nullable=False)
    negative_reason_key = Column(Integer, ForeignKey("DIM_NEGATIVE_REASON.negative_reason_key"), nullable=False)

    text = Column(String)
    retweet_count = Column(Integer, default=0)
    confidence_score = Column(Float, default=1.0)
    sentiment_score = Column(Float, default=0.0)
    followers = Column(Integer, default=0)
    friends = Column(Integer, default=0)
    text_length = Column(Integer, default=0)
    word_count = Column(Integer, default=0)

    # Relationships
    date_dim = relationship("DimDate", back_populates="facts")
    brand_dim = relationship("DimBrand", back_populates="facts")
    sentiment_dim = relationship("DimSentiment", foreign_keys=[sentiment_key], back_populates="facts")
    location_dim = relationship("DimLocation", back_populates="facts")
    source_dim = relationship("DimSource", back_populates="facts")
    negative_reason_dim = relationship("DimNegativeReason", back_populates="facts")
