# Rhapsody Golf --- Product Requirements Document (PRD)

## Normal Booking Flow --- MVP

**Document Status:** Draft\
**Version:** 0.1\
**Date:** 10 August 2026\
**Product:** Rhapsody Golf\
**Scope:** Normal Golf Booking Flow\
**Platforms:** Web Admin + Mobile App Golfer

> **Note (2026-08-10):** Dokumen ini adalah PRD terpisah yang fokus pada booking flow MVP.
> Untuk fitur platform lain (loyalty, tournaments, AI chat, superadmin analytics), lihat `PRD.md`.
>
> **Keputusan desain:** Tee time interval bersifat **configurable per course** — Admin Club mengatur nilai `tee_time_interval_minutes` (opsi: 8 / 10 / 15 / 30 menit, default 10 menit) di Course Configuration. Sistem generate slot availability berdasarkan nilai tersebut.

------------------------------------------------------------------------

## 1. Product Overview

Rhapsody Golf is a golf booking platform with three roles:

1.  **Superadmin** --- manages golf clubs and creates/manages Admin Club
    accounts.
2.  **Admin Club** --- manages one golf club/course, tee times,
    bookings, vouchers, tournaments/events, and payment status.
3.  **Golfer** --- discovers golf courses, selects tee times, creates
    bookings, pays, and views booking history.

This PRD focuses only on the **normal booking flow**.

The booking flow is inspired by the general booking experience shown in
the provided Swing reference material: golfer explores a course, views
course details, selects a date and tee time, reviews the booking,
proceeds to payment, and receives a booking confirmation.

> Note: The provided PDF is image-based and its text could not be
> machine-read. The requirements below therefore use the
> visible/reference flow discussed in the project conversation, combined
> with the Rhapsody requirements provided by the product owner.

------------------------------------------------------------------------

# 2. Goals

## 2.1 Primary Goals

-   Allow golfers to book an available tee time through the mobile app.
-   Allow Admin Club to configure course and tee-time availability.
-   Prevent overbooking of tee times.
-   Support voucher/discount application during booking.
-   Support payment and payment-status tracking.
-   Give golfers a clear booking confirmation and booking history.
-   Give Admin Club visibility into bookings and their status.

## 2.2 Secondary Goals

-   Create a foundation for future AI Smart Booking.
-   Create a booking model that can later support tournament/event
    registration.
-   Keep booking, payment, and tee-time status separate so each process
    can be managed independently.

------------------------------------------------------------------------

# 3. Non-Goals for MVP

The following are intentionally outside this PRD:

-   AI Smart Booking / AI Assistant
-   Tournament/Event registration
-   Tournament scoring
-   Handicap calculation
-   Advanced loyalty/membership system
-   Multi-course management under one Admin Club
-   Complex dynamic pricing
-   Automated refund workflow, unless required by the selected payment
    provider

These can be handled in later PRDs.

------------------------------------------------------------------------

# 4. User Roles

## 4.1 Superadmin

### Responsibility

-   Create golf club.
-   Create Admin Club account.
-   Activate/deactivate club.
-   Activate/deactivate Admin Club account.
-   View high-level booking/payment information if required by platform
    operations.

### Booking-related access

Superadmin is **not responsible for daily tee-time management or
creating golfer bookings**.

------------------------------------------------------------------------

## 4.2 Admin Club

### Responsibility

-   Manage course information.
-   Configure course/tee information.
-   Create and manage tee times.
-   View and manage bookings.
-   Create/manage vouchers.
-   View payment status.

### Booking-related access

Admin Club is the operational owner of the booking inventory for its
course.

------------------------------------------------------------------------

## 4.3 Golfer

### Responsibility

-   Register/login.
-   Browse golf courses.
-   View course details.
-   Select date and tee time.
-   Create booking.
-   Apply voucher.
-   Make payment.
-   View booking confirmation.
-   View upcoming and historical bookings.

------------------------------------------------------------------------

# 5. Platforms

  -----------------------------------------------------------------------
  Role                    Platform                Main Purpose
  ----------------------- ----------------------- -----------------------
  Superadmin              Web                     Platform/club
                                                  administration

  Admin Club              Web                     Course, tee time,
                                                  booking, voucher,
                                                  payment operations

  Golfer                  Mobile App              Course discovery,
                                                  booking, payment,
                                                  booking history
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 6. Product Structure

## 6.1 Superadmin Web

-   Dashboard
-   Club Management
-   Admin Club Management
-   Booking Overview
-   Payment Overview
-   Settings

## 6.2 Admin Club Web

-   Dashboard
-   Course Management
-   Tee Time Management
-   Booking Management
-   Voucher Management
-   Payment
-   Settings

## 6.3 Golfer Mobile App

-   Home
-   Explore Golf Courses
-   Course Detail
-   Booking
-   Payment
-   My Booking
-   Profile

------------------------------------------------------------------------

# 7. Core Booking Flow

The main booking journey:

``` text
Golfer Login
    ↓
Home / Explore
    ↓
Select Golf Course
    ↓
Course Detail
    ↓
Select Date
    ↓
Select Tee Time
    ↓
Booking Detail
    ↓
Select / Confirm Players
    ↓
Apply Voucher (Optional)
    ↓
Order Summary
    ↓
Confirm Booking
    ↓
Payment
    ↓
Payment Result
    ↓
Booking Confirmation
    ↓
My Booking / History
```

------------------------------------------------------------------------

# 8. Admin Setup Flow

Before a golfer can make a booking, the Admin Club must configure the
booking inventory.

``` text
Superadmin
    ↓
Create Club
    ↓
Create Admin Club Account
    ↓
Admin Club Login
    ↓
Complete Course Setup
    ↓
Configure Tee Time
    ↓
Set Price / Capacity
    ↓
Publish Availability
    ↓
Golfer Can Book
```

------------------------------------------------------------------------

# 9. Course Management

## 9.1 Objective

Allow Admin Club to maintain the information shown to golfers before
booking.

## 9.2 Course Information

Minimum fields:

-   Course Name
-   Description
-   Address
-   Location / Map Coordinates
-   Contact Number
-   Email
-   Course Images
-   Operating Hours
-   Facilities / Amenities

## 9.3 Course Configuration

Potential fields:

-   Number of holes
-   Par
-   Tee box
-   Course rating
-   Slope rating

The detailed scoring/handicap use of these fields is outside the current
booking MVP.

## 9.4 Acceptance Criteria

-   Admin can create/update course information.
-   Golfer can see the published course information.
-   Changes made by Admin are reflected in the golfer app after
    successful save/publish.
-   Admin cannot manage another club's course.

------------------------------------------------------------------------

# 10. Tee Time Management

## 10.1 Objective

Allow Admin Club to create the bookable inventory that golfers can
select.

## 10.2 Tee Time Data

Minimum fields:

-   Date
-   Start Time
-   Course
-   Capacity
-   Price
-   Status

Optional future fields:

-   Tee box
-   Special pricing
-   Booking restriction
-   Member price
-   Guest price

## 10.3 Tee Time Status

Recommended statuses:

-   Available
-   Almost Full
-   Full
-   Blocked
-   Closed
-   Completed

## 10.4 Admin Actions

Admin can:

-   Create tee time.
-   Edit tee time.
-   Block tee time.
-   Close tee time.
-   Reopen tee time where applicable.
-   View booking count.
-   View remaining capacity.

## 10.5 Example

  Tee Time     Capacity   Booked   Remaining Status
  ---------- ---------- -------- ----------- -------------
  06:00               4        4           0 Full
  06:10               4        2           2 Almost Full
  06:20               4        0           4 Available
  06:30               4        0           4 Blocked

## 10.6 Acceptance Criteria

-   Admin can create a tee time.
-   A golfer only sees tee times that are bookable.
-   A full tee time cannot be booked.
-   A blocked/closed tee time cannot be booked.
-   Remaining capacity is updated after a successful booking.
-   The system prevents the number of confirmed players from exceeding
    capacity.

------------------------------------------------------------------------

# 11. Golfer --- Course Discovery

## 11.1 Objective

Allow golfers to find a golf course before starting a booking.

## 11.2 Course List

Each course card may contain:

-   Course image
-   Course name
-   Location
-   Rating
-   Starting price

## 11.3 Search/Filter

MVP:

-   Location
-   Date
-   Price range

Future:

-   Distance
-   Rating
-   Facilities
-   Number of holes

------------------------------------------------------------------------

# 12. Golfer --- Course Detail

## 12.1 Information

Course Detail should contain:

-   Course image/banner
-   Course name
-   Location
-   Rating
-   Description
-   Facilities
-   Course information
-   Operating hours
-   Map/location
-   Contact information
-   Available tee times

## 12.2 Primary CTA

`Book Tee Time`

The CTA should lead the golfer into the booking selection flow.

------------------------------------------------------------------------

# 13. Golfer --- Date Selection

## 13.1 Flow

``` text
Course Detail
    ↓
Select Date
    ↓
Show Available Tee Times
```

The app should show available dates based on the configured booking
availability.

## 13.2 Rules

-   Past dates cannot be selected.
-   Dates without bookable tee times should be clearly indicated.
-   Availability must be retrieved from the latest server state.

------------------------------------------------------------------------

# 14. Golfer --- Tee Time Selection

## 14.1 UI

Example:

  Tee Time      Price Availability
  ---------- -------- --------------
  06:00        Rp xxx 4 slots
  06:10        Rp xxx 2 slots
  06:20        Rp xxx Full
  06:30        Rp xxx 4 slots

## 14.2 Rules

-   Golfer can only select an available tee time.
-   Full tee times cannot be selected.
-   Price shown must match the current server-side price.
-   Availability must be revalidated before booking confirmation.

------------------------------------------------------------------------

# 15. Booking Detail

After selecting a tee time, the golfer reviews the booking.

## 15.1 Information

-   Course
-   Date
-   Tee time
-   Number of players
-   Price per player
-   Subtotal
-   Voucher discount
-   Total
-   Booking terms

## 15.2 Player Selection

MVP recommendation:

-   Golfer can book for themselves.
-   Golfer can add additional players.
-   Maximum players cannot exceed the tee-time capacity.

Future:

-   Search registered golfers.
-   Guest player.
-   Player profile.
-   Handicap information.

------------------------------------------------------------------------

# 16. Voucher

Voucher is optional.

## 16.1 Flow

``` text
Booking Detail
    ↓
Apply Voucher
    ↓
Validate Voucher
    ↓
Calculate Discount
    ↓
Update Total
```

## 16.2 Voucher Validation

The system should validate:

-   Voucher code exists.
-   Voucher is active.
-   Current date is within validity period.
-   Minimum transaction requirement.
-   Usage limit.
-   Applicable course/tee time if configured.
-   User eligibility if configured.

## 16.3 Example

``` text
Subtotal       Rp 3.000.000
Voucher        -Rp 300.000
----------------------------
Total          Rp 2.700.000
```

The discount must be calculated server-side.

------------------------------------------------------------------------

# 17. Order Summary

Before payment, the golfer must see a final summary.

## 17.1 Required Information

``` text
Course
Rhapsody Golf Club

Date
15 August 2026

Tee Time
07:10

Players
4

Subtotal
Rp 4.000.000

Voucher
-Rp 400.000

Total
Rp 3.600.000
```

CTA:

`Continue to Payment`

------------------------------------------------------------------------

# 18. Booking Confirmation Before Payment

The system should create a temporary booking/reservation state before
payment so that the selected inventory can be protected for a limited
time.

Recommended flow:

``` text
Select Tee Time
    ↓
Create Pending Booking
    ↓
Reserve Capacity Temporarily
    ↓
Payment
```

The exact reservation duration should be configurable based on the
payment provider/business requirement.

Example:

``` text
Payment session expires in 15:00
```

If payment is not completed within the allowed period:

``` text
Pending Payment
      ↓
Expired
      ↓
Release Tee Time Capacity
```

------------------------------------------------------------------------

# 19. Payment

## 19.1 Flow

``` text
Order Summary
    ↓
Create Payment
    ↓
Payment Gateway
    ↓
User Completes Payment
    ↓
Payment Callback/Webhook
    ↓
Update Payment Status
    ↓
Update Booking Status
```

The specific payment provider is not defined in this PRD.

## 19.2 Payment Status

Recommended:

-   Pending
-   Paid
-   Failed
-   Expired
-   Refunded

## 19.3 Important Rule

Payment status and booking status must be separate.

Example:

``` text
Booking Status: Confirmed
Payment Status: Paid
```

------------------------------------------------------------------------

# 20. Booking Status

Recommended statuses:

### Pending Payment

Booking has been created but payment has not been completed.

### Confirmed

Payment is successfully completed and the tee-time slot is reserved.

### Cancelled

Booking has been cancelled according to the applicable cancellation
policy.

### Expired

Payment was not completed within the allowed payment window.

### Completed

The booked tee time has passed and the booking is considered completed.

------------------------------------------------------------------------

# 21. Booking State Machine

``` text
                  ┌───────────────┐
                  │    Pending    │
                  │    Payment    │
                  └───────┬───────┘
                          │
               ┌──────────┼──────────┐
               │          │          │
            Paid       Expired    Cancel
               │          │          │
               ↓          ↓          ↓
          ┌────────┐   ┌───────┐  ┌─────────┐
          │Confirmed│   │Expired│  │Cancelled│
          └────┬────┘   └───────┘  └─────────┘
               │
          Tee Time Passed
               │
               ↓
          ┌───────────┐
          │ Completed │
          └───────────┘
```

------------------------------------------------------------------------

# 22. Payment State Machine

``` text
Pending
   │
   ├── Success ──→ Paid
   │
   ├── Failed ───→ Failed
   │
   └── Timeout ──→ Expired

Paid
   │
   └── Refund ───→ Refunded
```

------------------------------------------------------------------------

# 23. Booking Confirmation

After successful payment, the golfer should receive a confirmation
screen.

## 23.1 Information

-   Booking ID
-   Course
-   Date
-   Tee time
-   Number of players
-   Total paid
-   Payment status
-   Booking status
-   QR code / booking code if required

Example:

``` text
Booking Confirmed ✓

Booking ID
RPG-20260815-001

Rhapsody Golf Club
15 August 2026
07:10 AM

4 Players

Total Paid
Rp 3.600.000

Status
CONFIRMED
```

CTA:

-   View Booking
-   Add to Calendar
-   Back to Home

------------------------------------------------------------------------

# 24. My Booking

Golfer should have:

``` text
My Booking

Upcoming
Completed
Cancelled
```

## Upcoming

Shows:

-   Course
-   Date
-   Tee time
-   Booking status
-   Booking ID

## Completed

Shows past bookings.

## Booking Detail

Contains:

-   Booking information
-   Player information
-   Payment information
-   Voucher
-   Booking status
-   Cancellation information if applicable

------------------------------------------------------------------------

# 25. Admin Club --- Booking Management

Admin Club needs a booking list.

## 25.1 Filters

-   Date
-   Tee time
-   Booking ID
-   Golfer
-   Booking status
-   Payment status

## 25.2 Booking List

Example:

  Booking ID   Golfer     Tee Time     Players   Amount Payment   Status
  ------------ ---------- ---------- --------- -------- --------- -----------------
  RPG-001      Golfer A   07:10              2   Rp xxx Paid      Confirmed
  RPG-002      Golfer B   07:20              4   Rp xxx Pending   Pending Payment

## 25.3 Booking Detail

Admin can see:

-   Booking ID
-   Golfer
-   Players
-   Course
-   Date
-   Tee time
-   Price
-   Voucher
-   Payment status
-   Booking status
-   Created date
-   Payment date

Cancellation/refund actions should only be enabled if the business
cancellation policy supports them.

------------------------------------------------------------------------

# 26. Admin Club --- Payment Monitoring

Admin Club needs a payment view.

Example:

``` text
Payment Overview

Today's Revenue
Rp xx.xxx.xxx

Paid
Rp xx.xxx.xxx

Pending
Rp xx.xxx.xxx

Failed
Rp xx.xxx.xxx
```

Payment list:

  Payment ID   Booking ID     Amount Method    Status    Date
  ------------ ------------ -------- --------- --------- --------
  PAY-001      RPG-001        Rp xxx Gateway   Paid      10 Aug
  PAY-002      RPG-002        Rp xxx Gateway   Pending   10 Aug

------------------------------------------------------------------------

# 27. Business Rules

## BR-01 --- Capacity

Confirmed players must never exceed tee-time capacity.

## BR-02 --- Availability

The backend is the source of truth for tee-time availability.

The mobile app must not rely only on cached availability.

## BR-03 --- Price

The final price must be calculated server-side.

The client may display a price, but the backend must revalidate it
before creating the payment.

## BR-04 --- Voucher

Voucher validation and discount calculation must be performed
server-side.

## BR-05 --- Payment

A booking becomes `Confirmed` only after the payment system confirms
successful payment.

## BR-06 --- Expired Payment

When payment expires or fails permanently, the temporary tee-time
reservation must be released according to the configured business rule.

## BR-07 --- Double Booking

The system must prevent two concurrent users from successfully booking
the same remaining capacity.

## BR-08 --- Past Tee Time

Past tee times cannot be booked.

## BR-09 --- Club Isolation

Admin Club can only view/manage data belonging to its assigned
club/course.

## BR-10 --- Booking History

A golfer can only view their own bookings.

------------------------------------------------------------------------

# 28. Error & Edge Cases

The system must handle:

### Tee time becomes full during checkout

Show:

> This tee time is no longer available. Please select another tee time.

### Price changes before payment

Show the latest price and require the golfer to review the updated
order.

### Voucher becomes invalid

Show:

> This voucher is no longer valid. Your booking total has been updated.

### Payment fails

Booking remains pending or transitions according to the payment flow,
and the golfer can retry if the payment window is still active.

### Payment succeeds but app does not receive the result

The backend payment webhook should remain the source of truth. The app
should be able to refresh and retrieve the final payment/booking status.

### User closes the app during payment

The booking should remain retrievable from `My Booking` while the
payment session is still valid.

------------------------------------------------------------------------

# 29. Notifications

MVP recommended notifications:

## Booking Created

> Your booking has been created. Please complete payment.

## Payment Success

> Your payment was successful. Your tee time is confirmed.

## Payment Failed

> Your payment could not be completed.

## Booking Expired

> Your booking has expired because payment was not completed.

## Booking Reminder

Future enhancement:

-   1 day before playing
-   Several hours before tee time

Channels can include:

-   In-app notification
-   Push notification
-   Email
-   WhatsApp/SMS, if supported later

------------------------------------------------------------------------

# 30. Recommended API/Domain Boundaries

The booking system should be structured so that future AI Smart Booking
can use the same business APIs.

Suggested domains:

``` text
Auth
  └── Login / Register / User

Club
  └── Course / Course Detail

Tee Time
  └── Availability / Schedule

Booking
  └── Create / Detail / Cancel / History

Voucher
  └── Validate / Apply

Payment
  └── Create Payment / Status / Webhook

Notification
  └── Booking / Payment Notifications
```

Future AI Agent can consume these capabilities through controlled tools
rather than accessing the database directly.

------------------------------------------------------------------------

# 31. MVP User Stories

## Golfer

### US-G-01 --- Register

As a golfer, I want to register an account so that I can make bookings.

### US-G-02 --- Login

As a golfer, I want to log in so that I can access my account and
bookings.

### US-G-03 --- Browse Course

As a golfer, I want to browse golf courses so that I can choose where to
play.

### US-G-04 --- View Course

As a golfer, I want to view course details so that I can decide whether
to book.

### US-G-05 --- Select Date

As a golfer, I want to select a playing date so that I can see available
tee times.

### US-G-06 --- Select Tee Time

As a golfer, I want to select an available tee time so that I can
reserve a playing slot.

### US-G-07 --- Add Players

As a golfer, I want to specify the number of players so that the booking
reflects my group size.

### US-G-08 --- Apply Voucher

As a golfer, I want to apply a valid voucher so that I can receive a
discount.

### US-G-09 --- Review Order

As a golfer, I want to review my booking and total price before payment.

### US-G-10 --- Pay

As a golfer, I want to pay for my booking so that my tee time is
confirmed.

### US-G-11 --- View Confirmation

As a golfer, I want to receive a booking confirmation after successful
payment.

### US-G-12 --- View Booking History

As a golfer, I want to view my upcoming and previous bookings.

------------------------------------------------------------------------

# 32. Admin Club User Stories

### US-A-01 --- Manage Course

As an Admin Club, I want to manage course information so that golfers
see accurate information.

### US-A-02 --- Create Tee Time

As an Admin Club, I want to create tee times so that golfers can book
available slots.

### US-A-03 --- Manage Tee Time

As an Admin Club, I want to block or close tee times so that unavailable
slots cannot be booked.

### US-A-04 --- View Booking

As an Admin Club, I want to view bookings so that I can manage daily
golf operations.

### US-A-05 --- View Payment

As an Admin Club, I want to view payment status so that I can monitor
paid and unpaid bookings.

### US-A-06 --- Manage Voucher

As an Admin Club, I want to create vouchers so that I can offer
promotions to golfers.

------------------------------------------------------------------------

# 33. Superadmin User Stories

### US-S-01 --- Create Club

As a Superadmin, I want to create a golf club so that it can use the
Rhapsody platform.

### US-S-02 --- Create Admin Club

As a Superadmin, I want to create an Admin Club account so that the club
can manage its course.

### US-S-03 --- Manage Club Status

As a Superadmin, I want to activate/deactivate a club so that platform
access can be controlled.

------------------------------------------------------------------------

# 34. MVP Priority

## P0 --- Must Have

### Platform

-   Authentication
-   Role-based access
-   Club setup
-   Course management

### Tee Time

-   Create tee time
-   Edit tee time
-   Availability
-   Capacity
-   Block/close tee time

### Golfer

-   Register/login
-   Course list
-   Course detail
-   Date selection
-   Tee-time selection
-   Player selection
-   Booking
-   Order summary
-   Payment
-   Confirmation
-   Booking history

### Admin

-   Booking list
-   Booking detail
-   Payment status

## P1 --- Should Have

-   Voucher
-   Push notifications
-   Booking cancellation
-   QR booking confirmation
-   Calendar integration
-   Revenue dashboard

## P2 --- Later

-   AI Smart Booking
-   Tournament/Event
-   Check-in
-   Scoring
-   Handicap
-   Advanced recommendation
-   Dynamic pricing
-   Loyalty/membership

------------------------------------------------------------------------

# 35. Suggested Development Phases

## Phase 1 --- Foundation

-   Authentication
-   User roles
-   Club
-   Course
-   Basic profile

## Phase 2 --- Tee Time

-   Tee-time configuration
-   Availability
-   Capacity
-   Tee-time status

## Phase 3 --- Normal Booking

-   Course discovery
-   Course detail
-   Date selection
-   Tee-time selection
-   Player selection
-   Booking creation
-   Booking detail

## Phase 4 --- Payment

-   Payment integration
-   Payment callback/webhook
-   Payment status
-   Booking confirmation
-   Expiration handling

## Phase 5 --- Voucher

-   Voucher creation
-   Voucher validation
-   Discount calculation
-   Voucher reporting

## Phase 6 --- Operations

-   Admin booking management
-   Payment monitoring
-   Notifications
-   Reports

## Phase 7 --- Future Features

-   Tournament/Event
-   Scoring
-   Handicap
-   AI Smart Booking Agent

------------------------------------------------------------------------

# 36. Key Product Decisions Still Required

The following items should be confirmed with the business/product owner
before development:

1.  Which payment gateway will be used?
2.  How long should a pending payment reserve a tee-time slot?
3.  Can golfers book for other golfers?
4.  Is a guest golfer allowed?
5.  Maximum players per booking?
6.  Can golfers cancel a booking?
7.  What is the cancellation/refund policy?
8.  Can Admin Club manually create a booking?
9.  Can Admin Club manually cancel a booking?
10. Can Admin Club change tee-time price after a booking exists?
11. Are prices the same for all golfers?
12. Are there member vs guest prices?
13. Can one tee time have different pricing packages?
14. Is booking available only for the club's configured date range?
15. Is payment required immediately?
16. What happens when payment succeeds but the tee time becomes
    unavailable due to concurrency?
17. Is QR code required for check-in?
18. What notifications are mandatory?
19. Which timezone should be used for course/tee-time operations?
20. What is the source of truth for payment confirmation?

------------------------------------------------------------------------

# 37. Definition of Done --- Normal Booking MVP

The Normal Booking MVP can be considered complete when:

-   A Superadmin can create a club and Admin Club account.
-   An Admin Club can configure course information.
-   An Admin Club can create and manage tee times.
-   A golfer can register/login.
-   A golfer can discover and view a course.
-   A golfer can select a date.
-   A golfer can see real-time/latest tee-time availability.
-   A golfer can select players.
-   A golfer can create a booking.
-   The system prevents overbooking.
-   A golfer can review the total price.
-   A golfer can complete payment.
-   Payment status is synchronized with the booking.
-   A successful payment creates a confirmed booking.
-   An expired/failed payment does not permanently consume tee-time
    capacity.
-   A golfer can view booking confirmation.
-   A golfer can view booking history.
-   Admin Club can view booking and payment status.
-   Booking and payment statuses are stored separately.
-   Core booking APIs are structured so they can later be consumed by
    the AI Smart Booking Agent.

------------------------------------------------------------------------

# 38. Recommended Next Deliverables

After this PRD, the recommended order is:

``` text
PRD
 ↓
Business Rules
 ↓
User Flow
 ↓
Information Architecture / Sitemap
 ↓
Wireframe
 ↓
UI Design
 ↓
Database / ERD
 ↓
API Specification
 ↓
User Stories
 ↓
Acceptance Criteria
 ↓
Test Scenarios / UAT
```

For Rhapsody, the next artifact should be the **Normal Booking User
Flow + detailed screen list**, covering both:

-   **Admin Club Web**
-   **Golfer Mobile App**

This can then be used as the direct basis for wireframes and development
backlog.
