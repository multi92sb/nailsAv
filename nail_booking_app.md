# Nail Booking Web App – Workflow & Architecture

## Overview
This document describes the workflow and architecture of a nail salon booking web app.

---

## User Flow
User → Login/Register → Create Profile → Home → Calendar → Select Slot → Book → Confirmation → Reminder

---

## Authentication Flow
- Open App
- Check if user is logged in
- If not:
  - Show Login/Register
  - Fill form (first name, last name, email, phone)
  - POST /users
  - Save user in DB
  - Generate token
  - Redirect to Home

---

## Booking Flow
- Load calendar
- GET /available-slots
- Show available days
- Select day
- Show available slots
- Select slot
- Check availability
  - If YES → create booking
  - If NO → show error
- POST /booking
- Save in DB
- Show success screen

---

## Notifications
- On booking:
  - Send confirmation email
  - Send SMS (optional)
  - Schedule reminder (1 day before)

---

## Gallery / Instagram
- Option 1: Upload media → store in DB
- Option 2: Fetch via Instagram API

---

## Database

Users:
- id
- firstName
- lastName
- email
- phone

Bookings:
- id
- userId
- date
- time
- status

Slots:
- id
- date
- time
- isAvailable

---

## API Endpoints

POST   /users  
POST   /login  
GET    /available-slots  
POST   /booking  
GET    /media  

---

## Architecture

Frontend (React-Typescript)
↓
Backend (Node.js)
↓
Database (Amazon S3)
↓
Integration middleware Services (Email, SMS, Instagram)

---

## Next Steps
1. Build backend
2. Build frontend
3. Connect booking logic
