# Secure LMS & Payment Gateway (Backend)

Node.js · Express · MongoDB · JWT · Razorpay · Stripe · Cloudinary

## Features
- **Auth:** register/login, bcrypt (cost 12), short-lived JWT access token + rotating httpOnly refresh-token cookie (stored hashed), logout/revocation
- **RBAC:** `student`, `instructor`, `admin` (admin cannot be self-registered)
- **Courses & lectures:** CRUD, thumbnail + video upload (Multer -> Cloudinary), free preview lectures, locked video URLs for non-enrolled users
- **Progress tracking:** per-lecture completion, percentage progress per enrollment
- **Payments:** Razorpay (order + signature verify + webhook) and Stripe (Checkout + webhook)
  - Price is read from DB, never trusted from client
  - Webhook signatures verified on the raw body
  - Idempotent fulfillment (`pending -> paid` atomic update + unique enrollment index)
- **Hardening:** Helmet, CORS allow-list, rate limiting (global / auth / payments), Joi validation with `stripUnknown`, centralized error handler, Winston + Morgan logging

## Setup
```bash
npm install
cp .env.example .env     # fill in values
npm run dev
```
Health check: `GET /health`

## API
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` `/login` `/refresh` `/logout` | public |
| GET | `/api/auth/me` | auth |
| GET | `/api/courses?page&limit&search&category` | public |
| GET | `/api/courses/:id` | public (locks videos unless enrolled/owner/preview) |
| GET | `/api/courses/mine` | instructor/admin |
| POST/PUT/DELETE | `/api/courses[/:id]` | instructor (owner)/admin |
| PUT | `/api/courses/:id/thumbnail` (field `thumbnail`) | owner/admin |
| POST | `/api/courses/:id/lectures` (multipart, field `video`) | owner/admin |
| GET | `/api/lectures/:id` | enrolled/owner/admin/preview |
| PUT/DELETE | `/api/lectures/:id` | owner/admin |
| POST/DELETE | `/api/lectures/:id/complete` | enrolled student |
| GET | `/api/progress/enrollments`, `/api/progress/courses/:id` | auth |
| POST | `/api/payments/free` `{courseId}` | auth |
| POST | `/api/payments/razorpay/order` `{courseId}` | auth |
| POST | `/api/payments/razorpay/verify` | auth |
| POST | `/api/payments/stripe/checkout` `{courseId}` | auth |
| GET | `/api/payments/history` | auth |
| POST | `/api/webhooks/stripe`, `/api/webhooks/razorpay` | provider signature |

## Webhook setup
- **Stripe:** endpoint `https://<host>/api/webhooks/stripe`, events `checkout.session.completed`, `checkout.session.expired`. Local: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
- **Razorpay:** dashboard -> Webhooks -> `https://<host>/api/webhooks/razorpay`, events `payment.captured`, `payment.failed`; set the same secret as `RAZORPAY_WEBHOOK_SECRET`

## Frontend flow (Razorpay)
1. `POST /api/payments/razorpay/order` -> open Razorpay Checkout with `order.id` and `keyId`
2. On success, send `razorpay_order_id/payment_id/signature` to `/razorpay/verify` (the webhook is the backup if the browser closes)
