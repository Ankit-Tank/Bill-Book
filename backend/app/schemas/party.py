from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class CreatePartySchema(BaseModel):
    """Schema for POST /api/v1/parties request body."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=255, description="Party legal or trade name")
    phone: Optional[str] = Field(None, max_length=50, description="Contact phone number")
    type: Literal["customer", "supplier"] = Field(..., description="Party classification")
    opening_balance: int = Field(0, description="Opening balance in paise")
    credit_limit: int = Field(0, ge=0, description="Credit limit in paise (0 = unlimited)")
    due_days: int = Field(30, ge=0, description="Payment credit period in days")


class UpdatePartySchema(BaseModel):
    """Schema for PATCH /api/v1/parties/:id request body."""
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    type: Optional[Literal["customer", "supplier"]] = None
    opening_balance: Optional[int] = None
    credit_limit: Optional[int] = Field(None, ge=0)
    due_days: Optional[int] = Field(None, ge=0)
    status: Optional[Literal["active", "archived"]] = None
