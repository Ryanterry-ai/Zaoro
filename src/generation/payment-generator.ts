export type PaymentProvider = 'stripe' | 'razorpay' | 'paypal' | 'square' | 'custom';

export interface PaymentConfig {
  provider: PaymentProvider;
  currency: string;
  webhookSecret: string;
  apiKey: string;
  enableSubscriptions: boolean;
  enableOneTimePayments: boolean;
  enableRefunds: boolean;
}

export interface PaymentCode {
  paymentService: string;
  providerImpl: string;
  webhookHandler: string;
  models: string;
  checkoutComponent: string;
  paymentHook: string;
  successPage: string;
  cancelPage: string;
  envExample: string;
  requirements: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
};

function envName(provider: PaymentProvider, suffix: string): string {
  const prefix = provider.toUpperCase();
  return `${prefix}_${suffix}`;
}

function sdkPackage(provider: PaymentProvider): string {
  const packages: Record<PaymentProvider, string> = {
    stripe: 'stripe>=7.0.0',
    razorpay: 'razorpay>=1.4.0',
    paypal: 'paypalrestsdk>=1.13.3',
    square: 'square>=27.0.0',
    custom: '',
  };
  return packages[provider];
}

function generateAbstractPaymentService(): string {
  return `"""Abstract payment service — provider-agnostic interface."""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    CANCELLED = "cancelled"


class RefundStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIALING = "trialing"
    UNPAID = "unpaid"


class PaymentResult(BaseModel):
    payment_id: str
    status: PaymentStatus
    client_secret: str | None = None
    redirect_url: str | None = None
    error: str | None = None


class RefundResult(BaseModel):
    refund_id: str
    status: RefundStatus
    amount_refunded: int
    error: str | None = None


class SubscriptionResult(BaseModel):
    subscription_id: str
    status: SubscriptionStatus
    client_secret: str | None = None
    error: str | None = None


class PaymentServiceBase(ABC):
    """Abstract base class that every payment provider must implement."""

    @abstractmethod
    async def create_checkout_session(
        self,
        amount: int,
        currency: str,
        metadata: dict[str, str] | None = None,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> PaymentResult:
        ...

    @abstractmethod
    async def retrieve_payment(self, payment_id: str) -> PaymentResult:
        ...

    @abstractmethod
    async def refund_payment(
        self, payment_id: str, amount: int | None = None
    ) -> RefundResult:
        ...

    @abstractmethod
    async def verify_webhook(
        self, payload: bytes, signature: str
    ) -> dict:
        ...

    @abstractmethod
    async def create_subscription(
        self,
        customer_id: str,
        price_amount: int,
        currency: str,
        interval: str,
        metadata: dict[str, str] | None = None,
    ) -> SubscriptionResult:
        ...

    @abstractmethod
    async def cancel_subscription(self, subscription_id: str) -> SubscriptionResult:
        ...

    @abstractmethod
    async def handle_webhook_event(self, event_type: str, data: dict) -> None:
        ...
`;
}

function generatePaymentModels(): string {
  return `"""Payment-related database models and schemas."""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import Column, String, Integer, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from models.base import Base


class TransactionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    CANCELLED = "cancelled"


class RefundStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIALING = "trialing"
    UNPAID = "unpaid"


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=True)
    provider = Column(String, nullable=False)
    provider_payment_id = Column(String, unique=True, nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String, nullable=False)
    status = Column(SAEnum(TransactionStatus), nullable=False, default=TransactionStatus.PENDING)
    client_secret = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    idempotency_key = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    refunds = relationship("PaymentRefund", back_populates="transaction")


class PaymentRefund(Base):
    __tablename__ = "payment_refunds"

    id = Column(String, primary_key=True)
    transaction_id = Column(String, ForeignKey("payment_transactions.id"), nullable=False)
    provider_refund_id = Column(String, unique=True, nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    status = Column(SAEnum(RefundStatus), nullable=False, default=RefundStatus.PENDING)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    transaction = relationship("PaymentTransaction", back_populates="refunds")


class PaymentSubscription(Base):
    __tablename__ = "payment_subscriptions"

    id = Column(String, primary_key=True)
    customer_id = Column(String, nullable=False, index=True)
    provider_subscription_id = Column(String, unique=True, nullable=False, index=True)
    plan_id = Column(String, nullable=True)
    amount = Column(Integer, nullable=False)
    currency = Column(String, nullable=False)
    interval = Column(String, nullable=False)
    status = Column(SAEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String, primary_key=True)
    provider = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    provider_event_id = Column(String, unique=True, nullable=False, index=True)
    payload = Column(Text, nullable=False)
    processed = Column(String, nullable=False, default="false")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class CreateCheckoutRequest(BaseModel):
    amount: int
    currency: str = "USD"
    product_name: str = "Purchase"
    metadata: dict[str, str] | None = None
    success_url: str | None = None
    cancel_url: str | None = None


class CreateSubscriptionRequest(BaseModel):
    customer_id: str
    price_amount: int
    currency: str = "USD"
    interval: str = "month"
    plan_name: str | None = None
    metadata: dict[str, str] | None = None


class RefundRequest(BaseModel):
    transaction_id: str
    amount: int | None = None
    reason: str | None = None


class PaymentResponse(BaseModel):
    payment_id: str
    status: str
    client_secret: str | None = None
    redirect_url: str | None = None
`;
}

function generateStripeProvider(): string {
  return `"""Stripe payment provider implementation."""

import os
import stripe
from stripe import PaymentIntent, Refund as StripeRefund, Subscription as StripeSubscription
from services.payment import (
    PaymentServiceBase,
    PaymentResult,
    RefundResult,
    SubscriptionResult,
    PaymentStatus,
    RefundStatus,
    SubscriptionStatus,
)


class StripePaymentService(PaymentServiceBase):
    def __init__(self) -> None:
        stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")
        self.webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        if not stripe_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable is required")
        stripe.api_key = stripe_key

    async def create_checkout_session(
        self,
        amount: int,
        currency: str,
        metadata: dict[str, str] | None = None,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> PaymentResult:
        try:
            intent = PaymentIntent.create(
                amount=amount,
                currency=currency.lower(),
                metadata=metadata or {},
                automatic_payment_methods={"enabled": True},
            )
            return PaymentResult(
                payment_id=intent.id,
                status=PaymentStatus.PENDING,
                client_secret=intent.client_secret,
                redirect_url=None,
                error=None,
            )
        except stripe.error.StripeError as e:
            return PaymentResult(
                payment_id="",
                status=PaymentStatus.FAILED,
                client_secret=None,
                redirect_url=None,
                error=str(e),
            )

    async def retrieve_payment(self, payment_id: str) -> PaymentResult:
        try:
            intent = PaymentIntent.retrieve(payment_id)
            status_map = {
                "requires_payment_method": PaymentStatus.PENDING,
                "requires_confirmation": PaymentStatus.PENDING,
                "requires_action": PaymentStatus.PENDING,
                "processing": PaymentStatus.PROCESSING,
                "succeeded": PaymentStatus.SUCCEEDED,
                "requires_capture": PaymentStatus.PENDING,
                "canceled": PaymentStatus.CANCELLED,
            }
            status = status_map.get(intent.status, PaymentStatus.FAILED)
            return PaymentResult(
                payment_id=intent.id,
                status=status,
                client_secret=intent.client_secret,
                redirect_url=None,
                error=None,
            )
        except stripe.error.StripeError as e:
            return PaymentResult(
                payment_id=payment_id,
                status=PaymentStatus.FAILED,
                client_secret=None,
                redirect_url=None,
                error=str(e),
            )

    async def refund_payment(
        self, payment_id: str, amount: int | None = None
    ) -> RefundResult:
        try:
            refund_params: dict = {"payment_intent": payment_id}
            if amount is not None:
                refund_params["amount"] = amount
            refund = StripeRefund.create(**refund_params)
            status = (
                RefundStatus.SUCCEEDED
                if refund.status == "succeeded"
                else RefundStatus.PENDING
            )
            return RefundResult(
                refund_id=refund.id,
                status=status,
                amount_refunded=refund.amount,
                error=None,
            )
        except stripe.error.StripeError as e:
            return RefundResult(
                refund_id="",
                status=RefundStatus.FAILED,
                amount_refunded=0,
                error=str(e),
            )

    async def verify_webhook(
        self, payload: bytes, signature: str
    ) -> dict:
        event = stripe.Webhook.construct_event(
            payload, signature, self.webhook_secret
        )
        return {
            "id": event.id,
            "type": event.type,
            "data": event.data.object,
        }

    async def create_subscription(
        self,
        customer_id: str,
        price_amount: int,
        currency: str,
        interval: str,
        metadata: dict[str, str] | None = None,
    ) -> SubscriptionResult:
        try:
            price = stripe.Price.create(
                unit_amount=price_amount,
                currency=currency.lower(),
                recurring={"interval": interval},
                product_data={"name": metadata.get("plan_name", "Subscription") if metadata else "Subscription"},
            )
            subscription = StripeSubscription.create(
                customer=customer_id,
                items=[{"price": price.id}],
                payment_behavior="default_incomplete",
                expand=["latest_invoice.payment_intent"],
            )
            client_secret = None
            if (
                subscription.latest_invoice
                and hasattr(subscription.latest_invoice, "payment_intent")
                and subscription.latest_invoice.payment_intent
            ):
                client_secret = subscription.latest_invoice.payment_intent.client_secret
            return SubscriptionResult(
                subscription_id=subscription.id,
                status=SubscriptionStatus.ACTIVE if subscription.status == "active" else SubscriptionStatus.TRIALING,
                client_secret=client_secret,
                error=None,
            )
        except stripe.error.StripeError as e:
            return SubscriptionResult(
                subscription_id="",
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=str(e),
            )

    async def cancel_subscription(self, subscription_id: str) -> SubscriptionResult:
        try:
            subscription = StripeSubscription.delete(subscription_id)
            return SubscriptionResult(
                subscription_id=subscription.id,
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=None,
            )
        except stripe.error.StripeError as e:
            return SubscriptionResult(
                subscription_id=subscription_id,
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=str(e),
            )

    async def handle_webhook_event(self, event_type: str, data: dict) -> None:
        if event_type == "payment_intent.succeeded":
            payment_id = data.get("id", "")
            print(f"Payment succeeded: {payment_id}")
        elif event_type == "payment_intent.payment_failed":
            payment_id = data.get("id", "")
            print(f"Payment failed: {payment_id}")
        elif event_type == "customer.subscription.updated":
            sub_id = data.get("id", "")
            print(f"Subscription updated: {sub_id}")
        elif event_type == "customer.subscription.deleted":
            sub_id = data.get("id", "")
            print(f"Subscription cancelled: {sub_id}")
`;
}

function generateRazorpayProvider(): string {
  return `"""Razorpay payment provider implementation."""

import os
import hmac
import hashlib
import razorpay
from services.payment import (
    PaymentServiceBase,
    PaymentResult,
    RefundResult,
    SubscriptionResult,
    PaymentStatus,
    RefundStatus,
    SubscriptionStatus,
)


class RazorpayPaymentService(PaymentServiceBase):
    def __init__(self) -> None:
        key_id = os.environ.get("RAZORPAY_KEY_ID", "")
        key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
        self.webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
        if not key_id or not key_secret:
            raise ValueError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required")
        self.client = razorpay.Client(auth=(key_id, key_secret))

    async def create_checkout_session(
        self,
        amount: int,
        currency: str,
        metadata: dict[str, str] | None = None,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> PaymentResult:
        try:
            order_data = {
                "amount": amount,
                "currency": currency.upper(),
                "receipt": metadata.get("order_id", "receipt") if metadata else "receipt",
                "notes": metadata or {},
            }
            order = self.client.order.create(data=order_data)
            return PaymentResult(
                payment_id=order["id"],
                status=PaymentStatus.PENDING,
                client_secret=order["id"],
                redirect_url=None,
                error=None,
            )
        except razorpay.errors.RazorpayError as e:
            return PaymentResult(
                payment_id="",
                status=PaymentStatus.FAILED,
                client_secret=None,
                redirect_url=None,
                error=str(e),
            )

    async def retrieve_payment(self, payment_id: str) -> PaymentResult:
        try:
            order = self.client.order.fetch(payment_id)
            status_map = {
                "created": PaymentStatus.PENDING,
                "attempted": PaymentStatus.PROCESSING,
                "paid": PaymentStatus.SUCCEEDED,
            }
            status = status_map.get(order["status"], PaymentStatus.FAILED)
            return PaymentResult(
                payment_id=order["id"],
                status=status,
                client_secret=order["id"],
                redirect_url=None,
                error=None,
            )
        except razorpay.errors.RazorpayError as e:
            return PaymentResult(
                payment_id=payment_id,
                status=PaymentStatus.FAILED,
                client_secret=None,
                redirect_url=None,
                error=str(e),
            )

    async def refund_payment(
        self, payment_id: str, amount: int | None = None
    ) -> RefundResult:
        try:
            refund_data: dict = {"payment_id": payment_id}
            if amount is not None:
                refund_data["amount"] = amount
            refund = self.client.payment.refund(data=refund_data)
            status = (
                RefundStatus.SUCCEEDED
                if refund.get("status") == "processed"
                else RefundStatus.PENDING
            )
            return RefundResult(
                refund_id=refund["id"],
                status=status,
                amount_refunded=refund.get("amount", 0),
                error=None,
            )
        except razorpay.errors.RazorpayError as e:
            return RefundResult(
                refund_id="",
                status=RefundStatus.FAILED,
                amount_refunded=0,
                error=str(e),
            )

    async def verify_webhook(
        self, payload: bytes, signature: str
    ) -> dict:
        import json
        body = json.loads(payload)
        generated_signature = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        if hmac.compare_digest(generated_signature, signature):
            return body
        raise ValueError("Invalid webhook signature")

    async def create_subscription(
        self,
        customer_id: str,
        price_amount: int,
        currency: str,
        interval: str,
        metadata: dict[str, str] | None = None,
    ) -> SubscriptionResult:
        try:
            plan = self.client.plan.create({
                "amount": price_amount,
                "currency": currency.upper(),
                "interval": 1,
                "period": interval if interval != "month" else "monthly",
            })
            subscription = self.client.subscription.create({
                "plan_id": plan["id"],
                "customer_id": customer_id,
                "notes": metadata or {},
            })
            return SubscriptionResult(
                subscription_id=subscription["id"],
                status=SubscriptionStatus.ACTIVE if subscription.get("status") == "active" else SubscriptionStatus.TRIALING,
                client_secret=None,
                error=None,
            )
        except razorpay.errors.RazorpayError as e:
            return SubscriptionResult(
                subscription_id="",
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=str(e),
            )

    async def cancel_subscription(self, subscription_id: str) -> SubscriptionResult:
        try:
            subscription = self.client.subscription.cancel(subscription_id)
            return SubscriptionResult(
                subscription_id=subscription["id"],
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=None,
            )
        except razorpay.errors.RazorpayError as e:
            return SubscriptionResult(
                subscription_id=subscription_id,
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=str(e),
            )

    async def handle_webhook_event(self, event_type: str, data: dict) -> None:
        if event_type == "payment.captured":
            payment_id = data.get("id", "")
            print(f"Payment captured: {payment_id}")
        elif event_type == "payment.failed":
            payment_id = data.get("id", "")
            print(f"Payment failed: {payment_id}")
        elif event_type == "subscription.activated":
            sub_id = data.get("id", "")
            print(f"Subscription activated: {sub_id}")
        elif event_type == "subscription.cancelled":
            sub_id = data.get("id", "")
            print(f"Subscription cancelled: {sub_id}")
`;
}

function generatePaypalProvider(): string {
  return `"""PayPal payment provider implementation."""

import os
import paypalrestsdk
from services.payment import (
    PaymentServiceBase,
    PaymentResult,
    RefundResult,
    SubscriptionResult,
    PaymentStatus,
    RefundStatus,
    SubscriptionStatus,
)


class PayPalPaymentService(PaymentServiceBase):
    def __init__(self) -> None:
        client_id = os.environ.get("PAYPAL_CLIENT_ID", "")
        client_secret = os.environ.get("PAYPAL_CLIENT_SECRET", "")
        self.webhook_id = os.environ.get("PAYPAL_WEBHOOK_ID", "")
        if not client_id or not client_secret:
            raise ValueError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required")
        paypalrestsdk.configure({
            "mode": os.environ.get("PAYPAL_MODE", "sandbox"),
            "client_id": client_id,
            "client_secret": client_secret,
        })

    async def create_checkout_session(
        self,
        amount: int,
        currency: str,
        metadata: dict[str, str] | None = None,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> PaymentResult:
        try:
            decimal_amount = amount / 100.0
            payment = paypalrestsdk.Payment({
                "intent": "sale",
                "payer": {"payment_method": "paypal"},
                "transactions": [{
                    "amount": {
                        "total": f"{decimal_amount:.2f}",
                        "currency": currency.upper(),
                    },
                    "description": metadata.get("description", "Payment") if metadata else "Payment",
                    "custom": metadata.get("order_id", "") if metadata else "",
                }],
                "redirect_urls": {
                    "return_url": success_url or "http://localhost:3000/payment/success",
                    "cancel_url": cancel_url or "http://localhost:3000/payment/cancel",
                },
            })
            if payment.create():
                approval_url = next(
                    (link.href for link in payment.links if link.rel == "approval_url"),
                    None,
                )
                return PaymentResult(
                    payment_id=payment.id,
                    status=PaymentStatus.PENDING,
                    client_secret=None,
                    redirect_url=approval_url,
                    error=None,
                )
            else:
                error_msg = payment.error.get("message", "Unknown PayPal error") if payment.error else "Unknown error"
                return PaymentResult(
                    payment_id="",
                    status=PaymentStatus.FAILED,
                    client_secret=None,
                    redirect_url=None,
                    error=error_msg,
                )
        except Exception as e:
            return PaymentResult(
                payment_id="",
                status=PaymentStatus.FAILED,
                client_secret=None,
                redirect_url=None,
                error=str(e),
            )

    async def retrieve_payment(self, payment_id: str) -> PaymentResult:
        try:
            payment = paypalrestsdk.Payment.find(payment_id)
            state_map = {
                "created": PaymentStatus.PENDING,
                "approved": PaymentStatus.SUCCEEDED,
                "pending": PaymentStatus.PROCESSING,
                "failed": PaymentStatus.FAILED,
                "cancelled": PaymentStatus.CANCELLED,
            }
            status = state_map.get(payment.state, PaymentStatus.FAILED)
            return PaymentResult(
                payment_id=payment.id,
                status=status,
                client_secret=None,
                redirect_url=None,
                error=None,
            )
        except Exception as e:
            return PaymentResult(
                payment_id=payment_id,
                status=PaymentStatus.FAILED,
                client_secret=None,
                redirect_url=None,
                error=str(e),
            )

    async def refund_payment(
        self, payment_id: str, amount: int | None = None
    ) -> RefundResult:
        try:
            sale_id = payment_id
            sale = paypalrestsdk.Sale.find(sale_id)
            refund_data: dict = {}
            if amount is not None:
                refund_data["amount"] = {
                    "total": f"{amount / 100.0:.2f}",
                    "currency": "USD",
                }
            refund = sale.refund(refund_data if refund_data else None)
            if refund.success():
                return RefundResult(
                    refund_id=refund.id,
                    status=RefundStatus.SUCCEEDED,
                    amount_refunded=int(float(refund.get("amount", {}).get("total", "0")) * 100),
                    error=None,
                )
            else:
                return RefundResult(
                    refund_id="",
                    status=RefundStatus.FAILED,
                    amount_refunded=0,
                    error=str(refund.error),
                )
        except Exception as e:
            return RefundResult(
                refund_id="",
                status=RefundStatus.FAILED,
                amount_refunded=0,
                error=str(e),
            )

    async def verify_webhook(
        self, payload: bytes, signature: str
    ) -> dict:
        import json
        return json.loads(payload)

    async def create_subscription(
        self,
        customer_id: str,
        price_amount: int,
        currency: str,
        interval: str,
        metadata: dict[str, str] | None = None,
    ) -> SubscriptionResult:
        try:
            decimal_amount = price_amount / 100.0
            plan = paypalrestsdk.BillingPlan({
                "name": metadata.get("plan_name", "Subscription") if metadata else "Subscription",
                "description": f"Subscription at {currency} {decimal_amount:.2f}/{interval}",
                "merchant_preferences": {
                    "auto_bill_outstanding": True,
                    "initial_fail_action_action": "CONTINUE",
                    "max_fail_attempts": 3,
                    "return_url": "http://localhost:3000/payment/success",
                    "cancel_url": "http://localhost:3000/payment/cancel",
                },
                "payment_definitions": [{
                    "name": "Subscription Payment",
                    "type": "REGULAR",
                    "frequency": interval.upper(),
                    "frequency_interval": 1,
                    "amount": {
                        "currency": currency.upper(),
                        "value": f"{decimal_amount:.2f}",
                    },
                    "cycles": "0",
                }],
                "type": "INFINITE",
            })
            if plan.create():
                agreement = paypalrestsdk.BillingAgreement({
                    "name": metadata.get("plan_name", "Subscription") if metadata else "Subscription",
                    "description": f"Subscription for {customer_id}",
                    "start_date": "2026-01-01T00:00:00Z",
                    "plan": {"id": plan.id},
                    "payer": {"payment_method": "paypal"},
                })
                if agreement.create():
                    return SubscriptionResult(
                        subscription_id=agreement.id,
                        status=SubscriptionStatus.ACTIVE,
                        client_secret=None,
                        error=None,
                    )
                return SubscriptionResult(
                    subscription_id="",
                    status=SubscriptionStatus.CANCELLED,
                    client_secret=None,
                    error=str(agreement.error),
                )
            return SubscriptionResult(
                subscription_id="",
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=str(plan.error),
            )
        except Exception as e:
            return SubscriptionResult(
                subscription_id="",
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=str(e),
            )

    async def cancel_subscription(self, subscription_id: str) -> SubscriptionResult:
        try:
            agreement = paypalrestsdk.BillingAgreement.find(subscription_id)
            if agreement.cancel("User requested cancellation"):
                return SubscriptionResult(
                    subscription_id=subscription_id,
                    status=SubscriptionStatus.CANCELLED,
                    client_secret=None,
                    error=None,
                )
            return SubscriptionResult(
                subscription_id=subscription_id,
                status=SubscriptionStatus.ACTIVE,
                client_secret=None,
                error="Cancellation failed",
            )
        except Exception as e:
            return SubscriptionResult(
                subscription_id=subscription_id,
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=str(e),
            )

    async def handle_webhook_event(self, event_type: str, data: dict) -> None:
        if event_type == "PAYMENT.SALE.COMPLETED":
            payment_id = data.get("id", "")
            print(f"Payment completed: {payment_id}")
        elif event_type == "PAYMENT.SALE.REFUNDED":
            payment_id = data.get("id", "")
            print(f"Payment refunded: {payment_id}")
        elif event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
            sub_id = data.get("id", "")
            print(f"Subscription activated: {sub_id}")
        elif event_type == "BILLING.SUBSCRIPTION.CANCELLED":
            sub_id = data.get("id", "")
            print(f"Subscription cancelled: {sub_id}")
`;
}

function generateSquareProvider(): string {
  return `"""Square payment provider implementation."""

import os
import squareup
from squareup.client import Client
from squareup.models import CreatePaymentRequest, CreateRefundRequest
from services.payment import (
    PaymentServiceBase,
    PaymentResult,
    RefundResult,
    SubscriptionResult,
    PaymentStatus,
    RefundStatus,
    SubscriptionStatus,
)


class SquarePaymentService(PaymentServiceBase):
    def __init__(self) -> None:
        access_token = os.environ.get("SQUARE_ACCESS_TOKEN", "")
        self.webhook_signature_key = os.environ.get("SQUARE_WEBHOOK_SIGNATURE_KEY", "")
        self.location_id = os.environ.get("SQUARE_LOCATION_ID", "")
        if not access_token:
            raise ValueError("SQUARE_ACCESS_TOKEN is required")
        self.client = Client(
            access_token=access_token,
            environment=os.environ.get("SQUARE_ENVIRONMENT", "sandbox"),
        )

    async def create_checkout_session(
        self,
        amount: int,
        currency: str,
        metadata: dict[str, str] | None = None,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> PaymentResult:
        try:
            request = CreatePaymentRequest(
                source_id="cnon:card-nonce-ok",
                idempotency_key=metadata.get("idempotency_key", "") if metadata else "",
                amount_money={
                    "amount": amount,
                    "currency": currency.upper(),
                },
                location_id=self.location_id,
                note=metadata.get("description", "") if metadata else "",
            )
            response = self.client.payments.create_payment(request)
            if response.is_success():
                payment = response.body.get("payment", {})
                return PaymentResult(
                    payment_id=payment.get("id", ""),
                    status=PaymentStatus.PENDING,
                    client_secret=payment.get("id"),
                    redirect_url=None,
                    error=None,
                )
            else:
                errors = response.errors or []
                error_msg = errors[0].get("detail", "Unknown Square error") if errors else "Unknown error"
                return PaymentResult(
                    payment_id="",
                    status=PaymentStatus.FAILED,
                    client_secret=None,
                    redirect_url=None,
                    error=error_msg,
                )
        except Exception as e:
            return PaymentResult(
                payment_id="",
                status=PaymentStatus.FAILED,
                client_secret=None,
                redirect_url=None,
                error=str(e),
            )

    async def retrieve_payment(self, payment_id: str) -> PaymentResult:
        try:
            response = self.client.payments.get_payment(payment_id)
            if response.is_success():
                payment = response.body.get("payment", {})
                state_map = {
                    "COMPLETED": PaymentStatus.SUCCEEDED,
                    "APPROVED": PaymentStatus.PENDING,
                    "PENDING": PaymentStatus.PROCESSING,
                    "CANCELED": PaymentStatus.CANCELLED,
                    "FAILED": PaymentStatus.FAILED,
                }
                status = state_map.get(payment.get("status", ""), PaymentStatus.FAILED)
                return PaymentResult(
                    payment_id=payment.get("id", ""),
                    status=status,
                    client_secret=None,
                    redirect_url=None,
                    error=None,
                )
            else:
                errors = response.errors or []
                error_msg = errors[0].get("detail", "Unknown error") if errors else "Unknown error"
                return PaymentResult(
                    payment_id=payment_id,
                    status=PaymentStatus.FAILED,
                    client_secret=None,
                    redirect_url=None,
                    error=error_msg,
                )
        except Exception as e:
            return PaymentResult(
                payment_id=payment_id,
                status=PaymentStatus.FAILED,
                client_secret=None,
                redirect_url=None,
                error=str(e),
            )

    async def refund_payment(
        self, payment_id: str, amount: int | None = None
    ) -> RefundResult:
        try:
            request_body: dict = {
                "idempotency_key": f"refund-{payment_id}",
                "payment_id": payment_id,
            }
            if amount is not None:
                request_body["amount_money"] = {
                    "amount": amount,
                    "currency": "USD",
                }
            response = self.client.refunds.refund_payment(request_body)
            if response.is_success():
                refund = response.body.get("refund", {})
                return RefundResult(
                    refund_id=refund.get("id", ""),
                    status=RefundStatus.SUCCEEDED,
                    amount_refunded=refund.get("amount_money", {}).get("amount", 0),
                    error=None,
                )
            else:
                errors = response.errors or []
                error_msg = errors[0].get("detail", "Unknown error") if errors else "Unknown error"
                return RefundResult(
                    refund_id="",
                    status=RefundStatus.FAILED,
                    amount_refunded=0,
                    error=error_msg,
                )
        except Exception as e:
            return RefundResult(
                refund_id="",
                status=RefundStatus.FAILED,
                amount_refunded=0,
                error=str(e),
            )

    async def verify_webhook(
        self, payload: bytes, signature: str
    ) -> dict:
        import json
        import hmac
        import hashlib
        import base64
        import time
        timestamp = str(int(time.time()))
        body = payload.decode("utf-8")
        signature_data = f"{timestamp}{body}"
        expected = hmac.new(
            self.webhook_signature_key.encode(),
            signature_data.encode(),
            hashlib.sha256,
        ).hexdigest()
        if hmac.compare_digest(expected, signature):
            return json.loads(body)
        raise ValueError("Invalid webhook signature")

    async def create_subscription(
        self,
        customer_id: str,
        price_amount: int,
        currency: str,
        interval: str,
        metadata: dict[str, str] | None = None,
    ) -> SubscriptionResult:
        try:
            response = self.client.subscriptions.create_subscription({
                "idempotency_key": f"sub-{customer_id}-{price_amount}",
                "location_id": self.location_id,
                "customer_id": customer_id,
                "card_id": "",
                "plan_id": metadata.get("plan_id", "") if metadata else "",
                "start_date": "2026-01-01",
            })
            if response.is_success():
                subscription = response.body.get("subscription", {})
                return SubscriptionResult(
                    subscription_id=subscription.get("id", ""),
                    status=SubscriptionStatus.ACTIVE,
                    client_secret=None,
                    error=None,
                )
            else:
                errors = response.errors or []
                error_msg = errors[0].get("detail", "Unknown error") if errors else "Unknown error"
                return SubscriptionResult(
                    subscription_id="",
                    status=SubscriptionStatus.CANCELLED,
                    client_secret=None,
                    error=error_msg,
                )
        except Exception as e:
            return SubscriptionResult(
                subscription_id="",
                status=SubscriptionStatus.CANCELLED,
                client_secret=None,
                error=str(e),
            )

    async def cancel_subscription(self, subscription_id: str) -> SubscriptionResult:
        try:
            response = self.client.subscriptions.cancel_subscription(subscription_id)
            if response.is_success():
                return SubscriptionResult(
                    subscription_id=subscription_id,
                    status=SubscriptionStatus.CANCELLED,
                    client_secret=None,
                    error=None,
                )
            else:
                errors = response.errors or []
                error_msg = errors[0].get("detail", "Cancellation failed") if errors else "Cancellation failed"
                return SubscriptionResult(
                    subscription_id=subscription_id,
                    status=SubscriptionStatus.ACTIVE,
                    client_secret=None,
                    error=error_msg,
                )
        except Exception as e:
            return SubscriptionResult(
                subscription_id=subscription_id,
                status=SubscriptionStatus.ACTIVE,
                client_secret=None,
                error=str(e),
            )

    async def handle_webhook_event(self, event_type: str, data: dict) -> None:
        if event_type == "payment.completed":
            payment_id = data.get("data", {}).get("object", {}).get("payment", {}).get("id", "")
            print(f"Payment completed: {payment_id}")
        elif event_type == "refund.created":
            refund_id = data.get("data", {}).get("object", {}).get("refund", {}).get("id", "")
            print(f"Refund created: {refund_id}")
        elif event_type == "subscription.updated":
            sub_id = data.get("data", {}).get("object", {}).get("subscription", {}).get("id", "")
            print(f"Subscription updated: {sub_id}")
        elif event_type == "subscription.deleted":
            sub_id = data.get("data", {}).get("object", {}).get("subscription", {}).get("id", "")
            print(f"Subscription deleted: {sub_id}")
`;
}

export function generateWebhookHandler(config: PaymentConfig): string {
  const providerUpper = config.provider.toUpperCase();
  return `"""Webhook handler for ${providerUpper} payment events."""

import os
from fastapi import APIRouter, Request, HTTPException, Header
from services.payment import get_payment_service
from models.payment import WebhookEvent
from database import get_db

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/${config.provider}")
async def handle_${config.provider}_webhook(
    request: Request,
    x_${config.provider}_signature: str | None = Header(None),
) -> dict:
    """Handle incoming ${providerUpper} webhook events."""
    payload = await request.body()

    service = get_payment_service("${config.provider}")

    try:
        verified_event = await service.verify_webhook(payload, x_${config.provider}_signature or "")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook verification failed: {str(e)}")

    event_id = verified_event.get("id", "")
    event_type = verified_event.get("type", "")
    event_data = verified_event.get("data", {})

    db = next(get_db())
    existing = db.query(WebhookEvent).filter(
        WebhookEvent.provider_event_id == event_id
    ).first()
    if existing:
        return {"status": "already_processed", "event_id": event_id}

    webhook_record = WebhookEvent(
        id=event_id,
        provider="${config.provider}",
        event_type=event_type,
        provider_event_id=event_id,
        payload=str(event_data),
        processed="false",
    )
    db.add(webhook_record)
    db.commit()

    try:
        await service.handle_webhook_event(event_type, event_data)
        webhook_record.processed = "true"
        db.commit()
    except Exception as e:
        webhook_record.processed = "error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

    return {"status": "processed", "event_id": event_id, "event_type": event_type}
`;
}

export function generatePaymentService(config: PaymentConfig): string {
  const providerClass = {
    stripe: 'StripePaymentService',
    razorpay: 'RazorpayPaymentService',
    paypal: 'PayPalPaymentService',
    square: 'SquarePaymentService',
    custom: 'CustomPaymentService',
  }[config.provider];

  const importPath = `services.payment_${config.provider}`;

  return `"""Payment service factory — creates the correct provider instance."""

import os
from services.payment import PaymentServiceBase


def get_payment_service(provider: str | None = None) -> PaymentServiceBase:
    """Factory that returns the configured payment provider."""
    selected = provider or os.environ.get("PAYMENT_PROVIDER", "${config.provider}")

    if selected == "stripe":
        from services.payment_stripe import StripePaymentService
        return StripePaymentService()
    elif selected == "razorpay":
        from services.payment_razorpay import RazorpayPaymentService
        return RazorpayPaymentService()
    elif selected == "paypal":
        from services.payment_paypal import PayPalPaymentService
        return PayPalPaymentService()
    elif selected == "square":
        from services.payment_square import SquarePaymentService
        return SquarePaymentService()
    else:
        raise ValueError(f"Unsupported payment provider: {selected}")
`;
}

function generateCheckoutComponent(config: PaymentConfig): string {
  const symbol = CURRENCY_SYMBOLS[config.currency] || config.currency;

  return `"use client";

import { useState, useCallback } from "react";

interface CheckoutProps {
  amount: number;
  currency?: string;
  productName?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

interface PaymentState {
  status: "idle" | "loading" | "redirecting" | "error";
  error: string | null;
  clientSecret: string | null;
  redirectUrl: string | null;
}

export default function Checkout({
  amount,
  currency = "${config.currency}",
  productName = "Purchase",
  onSuccess,
  onError,
}: CheckoutProps) {
  const [state, setState] = useState<PaymentState>({
    status: "idle",
    error: null,
    clientSecret: null,
    redirectUrl: null,
  });

  const handleCheckout = useCallback(async () => {
    setState({ status: "loading", error: null, clientSecret: null, redirectUrl: null });

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency,
          product_name: productName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Checkout failed");
      }

      if (data.redirect_url) {
        setState({ status: "redirecting", error: null, clientSecret: null, redirectUrl: data.redirect_url });
        window.location.href = data.redirect_url;
        return;
      }

      if (data.client_secret) {
        setState({ status: "idle", error: null, clientSecret: data.client_secret, redirectUrl: null });
        onSuccess?.(data.payment_id);
        return;
      }

      if (data.status === "succeeded") {
        onSuccess?.(data.payment_id);
        return;
      }

      throw new Error("Unexpected response from payment service");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setState({ status: "error", error: message, clientSecret: null, redirectUrl: null });
      onError?.(message);
    }
  }, [amount, currency, productName, onSuccess, onError]);

  return (
    <div className="checkout-container">
      <div className="checkout-summary">
        <p className="checkout-product">{productName}</p>
        <p className="checkout-amount">
          {symbol}{(amount).toFixed(2)} {currency}
        </p>
      </div>

      {state.error && (
        <div className="checkout-error" role="alert">
          {state.error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={state.status === "loading" || state.status === "redirecting"}
        className="checkout-button"
      >
        {state.status === "loading" ? "Processing..." : state.status === "redirecting" ? "Redirecting..." : "Pay " + symbol + amount.toFixed(2)}
      </button>
    </div>
  );
}
`;
}

function generatePaymentHook(config: PaymentConfig): string {
  return `"use client";

import { useState, useCallback } from "react";

interface UsePaymentOptions {
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

interface PaymentResult {
  paymentId: string;
  status: string;
  clientSecret: string | null;
  redirectUrl: string | null;
}

interface UsePaymentReturn {
  checkout: (params: {
    amount: number;
    currency?: string;
    productName?: string;
  }) => Promise<PaymentResult>;
  refund: (params: {
    transactionId: string;
    amount?: number;
    reason?: string;
  }) => Promise<{ refundId: string; status: string }>;
  loading: boolean;
  error: string | null;
}

export function usePayment(options: UsePaymentOptions = {}): UsePaymentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(
    async (params: {
      amount: number;
      currency?: string;
      productName?: string;
    }): Promise<PaymentResult> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(params.amount * 100),
            currency: params.currency ?? "USD",
            product_name: params.productName ?? "Purchase",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || data.error || "Checkout failed");
        }

        const result: PaymentResult = {
          paymentId: data.payment_id ?? "",
          status: data.status ?? "pending",
          clientSecret: data.client_secret ?? null,
          redirectUrl: data.redirect_url ?? null,
        };

        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        }

        options.onSuccess?.(result.paymentId);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Payment failed";
        setError(message);
        options.onError?.(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  const refund = useCallback(
    async (params: {
      transactionId: string;
      amount?: number;
      reason?: string;
    }): Promise<{ refundId: string; status: string }> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/payments/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: params.transactionId,
            amount: params.amount != null ? Math.round(params.amount * 100) : undefined,
            reason: params.reason,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || data.error || "Refund failed");
        }

        return {
          refundId: data.refund_id ?? "",
          status: data.status ?? "pending",
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Refund failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { checkout, refund, loading, error };
}
`;
}

function generateSuccessPage(config: PaymentConfig): string {
  return `import Link from "next/link";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const paymentId = typeof params.payment_id === "string" ? params.payment_id : null;

  return (
    <div className="payment-result-page">
      <div className="payment-result-card">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1>Payment Successful</h1>
        <p>Your payment has been processed successfully.</p>
        {paymentId && (
          <p className="payment-id">
            Reference: <code>{paymentId}</code>
          </p>
        )}
        <Link href="/" className="return-button">
          Return Home
        </Link>
      </div>
    </div>
  );
}
`;
}

function generateCancelPage(): string {
  return `import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="payment-result-page">
      <div className="payment-result-card">
        <div className="cancel-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. No charges were made.</p>
        <Link href="/" className="return-button">
          Return Home
        </Link>
      </div>
    </div>
  );
}
`;
}

function generateEnvExample(config: PaymentConfig): string {
  const lines: string[] = [];

  lines.push(`# ============================================`);
  lines.push(`# Payment Configuration — ${config.provider.toUpperCase()}`);
  lines.push(`# ============================================`);
  lines.push("");
  lines.push(`PAYMENT_PROVIDER=${config.provider}`);
  lines.push(`DEFAULT_CURRENCY=${config.currency}`);
  lines.push("");

  switch (config.provider) {
    case "stripe":
      lines.push("STRIPE_SECRET_KEY=sk_test_...");
      lines.push("STRIPE_PUBLISHABLE_KEY=pk_test_...");
      lines.push("STRIPE_WEBHOOK_SECRET=whsec_...");
      lines.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...");
      break;
    case "razorpay":
      lines.push("RAZORPAY_KEY_ID=rzp_test_...");
      lines.push("RAZORPAY_KEY_SECRET=...");
      lines.push("RAZORPAY_WEBHOOK_SECRET=...");
      break;
    case "paypal":
      lines.push("PAYPAL_CLIENT_ID=...");
      lines.push("PAYPAL_CLIENT_SECRET=...");
      lines.push("PAYPAL_WEBHOOK_ID=...");
      lines.push("PAYPAL_MODE=sandbox");
      break;
    case "square":
      lines.push("SQUARE_ACCESS_TOKEN=sq0atp_...");
      lines.push("SQUARE_LOCATION_ID=...");
      lines.push("SQUARE_WEBHOOK_SIGNATURE_KEY=...");
      lines.push("SQUARE_ENVIRONMENT=sandbox");
      break;
    case "custom":
      lines.push("CUSTOM_PAYMENT_API_KEY=...");
      lines.push("CUSTOM_PAYMENT_WEBHOOK_SECRET=...");
      break;
  }

  lines.push("");
  lines.push(`# Webhook endpoint: POST /api/webhooks/${config.provider}`);

  return lines.join("\n");
}

function generateRequirements(config: PaymentConfig): string {
  const extras: string[] = [
    "fastapi>=0.115.0",
    "uvicorn>=0.32.0",
    "pydantic>=2.10.0",
    "sqlalchemy>=2.0.0",
  ];

  const sdk = sdkPackage(config.provider);
  if (sdk) {
    extras.push(sdk);
  }

  return extras.join("\n");
}

function generatePaymentRoutes(config: PaymentConfig): string {
  return `"""Payment API routes."""

import uuid
from fastapi import APIRouter, HTTPException, Depends
from models.payment import (
    CreateCheckoutRequest,
    CreateSubscriptionRequest,
    RefundRequest,
    PaymentResponse,
)
from services.payment_factory import get_payment_service
from database import get_db

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/checkout", response_model=PaymentResponse)
async def create_checkout(request: CreateCheckoutRequest) -> PaymentResponse:
    """Create a new checkout session."""
    service = get_payment_service()

    result = await service.create_checkout_session(
        amount=request.amount,
        currency=request.currency,
        metadata={"order_id": str(uuid.uuid4()), "product_name": request.product_name},
        success_url=request.success_url,
        cancel_url=request.cancel_url,
    )

    if result.error:
        raise HTTPException(status_code=400, detail=result.error)

    return PaymentResponse(
        payment_id=result.payment_id,
        status=result.status.value,
        client_secret=result.client_secret,
        redirect_url=result.redirect_url,
    )


@router.get("/status/{payment_id}", response_model=PaymentResponse)
async def get_payment_status(payment_id: str) -> PaymentResponse:
    """Get the current status of a payment."""
    service = get_payment_service()

    result = await service.retrieve_payment(payment_id)

    if result.error:
        raise HTTPException(status_code=404, detail=result.error)

    return PaymentResponse(
        payment_id=result.payment_id,
        status=result.status.value,
        client_secret=result.client_secret,
        redirect_url=result.redirect_url,
    )


@router.post("/refund")
async def refund_payment(request: RefundRequest) -> dict:
    """Process a refund for a completed payment."""
    service = get_payment_service()

    if not os.environ.get("ENABLE_REFUNDS", "true").lower() == "true":
        raise HTTPException(status_code=403, detail="Refunds are not enabled")

    result = await service.refund_payment(
        payment_id=request.transaction_id,
        amount=request.amount,
    )

    if result.error:
        raise HTTPException(status_code=400, detail=result.error)

    return {
        "refund_id": result.refund_id,
        "status": result.status.value,
        "amount_refunded": result.amount_refunded,
    }


@router.post("/subscriptions", response_model=PaymentResponse)
async def create_subscription(request: CreateSubscriptionRequest) -> PaymentResponse:
    """Create a new subscription."""
    service = get_payment_service()

    result = await service.create_subscription(
        customer_id=request.customer_id,
        price_amount=request.price_amount,
        currency=request.currency,
        interval=request.interval,
        metadata={"plan_name": request.plan_name} if request.plan_name else None,
    )

    if result.error:
        raise HTTPException(status_code=400, detail=result.error)

    return PaymentResponse(
        payment_id=result.subscription_id,
        status=result.status.value,
        client_secret=result.client_secret,
        redirect_url=None,
    )


@router.delete("/subscriptions/{subscription_id}")
async def cancel_subscription(subscription_id: str) -> dict:
    """Cancel an active subscription."""
    service = get_payment_service()

    result = await service.cancel_subscription(subscription_id)

    if result.error:
        raise HTTPException(status_code=400, detail=result.error)

    return {
        "subscription_id": result.subscription_id,
        "status": result.status.value,
    }
`;
}

export function generateCheckoutUI(config: PaymentConfig): string {
  return generateCheckoutComponent(config);
}

export function generatePaymentIntegration(config: PaymentConfig): PaymentCode {
  const provider = config.provider;

  const paymentService = generateAbstractPaymentService();
  const models = generatePaymentModels();
  const checkoutComponent = generateCheckoutComponent(config);
  const paymentHook = generatePaymentHook(config);
  const successPage = generateSuccessPage(config);
  const cancelPage = generateCancelPage();
  const envExample = generateEnvExample(config);
  const requirements = generateRequirements(config);

  let providerImpl: string;
  switch (provider) {
    case "stripe":
      providerImpl = generateStripeProvider();
      break;
    case "razorpay":
      providerImpl = generateRazorpayProvider();
      break;
    case "paypal":
      providerImpl = generatePaypalProvider();
      break;
    case "square":
      providerImpl = generateSquareProvider();
      break;
    default:
      providerImpl = generateStripeProvider();
      break;
  }

  const webhookHandler = generateWebhookHandler(config);
  const paymentRoutes = generatePaymentRoutes(config);

  return {
    paymentService: paymentService + "\n" + generatePaymentService(config) + "\n" + paymentRoutes,
    providerImpl,
    webhookHandler,
    models,
    checkoutComponent,
    paymentHook,
    successPage,
    cancelPage,
    envExample,
    requirements,
  };
}
