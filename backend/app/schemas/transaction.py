from datetime import date
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class CreateTransactionSchema(BaseModel):
    """Schema for POST /api/v1/transactions request body."""
    model_config = ConfigDict(extra="forbid")

    party_id: UUID = Field(..., description="Target party UUID")
    kind: Literal["DR", "CR"] = Field(..., description="Transaction type: DR (debit/sale) or CR (credit/payment)")
    amount: int = Field(..., gt=0, description="Transaction amount in paise (must be a positive integer)")
    txn_date: Optional[date] = Field(None, description="Transaction date (YYYY-MM-DD), defaults to current date")
    particulars: Optional[str] = Field(None, max_length=1000, description="Notes, item list, or invoice remarks")
    source: Literal["manual", "photo", "voice"] = Field("manual", description="Origin of the transaction")
    bill_image_path: Optional[str] = Field(None, description="Storage path of attached receipt/bill")


class UpdateTransactionSchema(BaseModel):
    """Schema for PATCH /api/v1/transactions/:id request body."""
    model_config = ConfigDict(extra="forbid")

    party_id: Optional[UUID] = None
    kind: Optional[Literal["DR", "CR"]] = None
    amount: Optional[int] = Field(None, gt=0, description="Amount must be a positive integer in paise")
    txn_date: Optional[date] = None
    particulars: Optional[str] = Field(None, max_length=1000)
    source: Optional[Literal["manual", "photo", "voice"]] = None
    bill_image_path: Optional[str] = None
