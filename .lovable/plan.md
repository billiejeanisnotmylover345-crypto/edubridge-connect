

# EduBridge – Mentorship & Learning Management Platform

## Overview
A modern, colorful mentorship platform connecting learners with mentors, managed by admins. Built with React + Supabase for full-stack functionality.

---

## Phase 1: Core Foundation (This Implementation)

### 1. Authentication & Role-Based Access
- Sign up / Login pages with Supabase Auth
- Three roles: **Learner**, **Mentor**, **Admin**
- Role stored in a `user_roles` table (secure, no privilege escalation)
- Redirect to role-specific dashboard after login

### 2. Profile Completion Flow
- After first login, users complete their profile (bio, interests, learning goals for learners)
- Profile data stored in a `profiles` table

### 3. Role-Based Dashboards
- **Learner Dashboard**: View assigned mentor, upcoming sessions, recent Q&A, quick stats
- **Mentor Dashboard**: View assigned students, upcoming sessions, pending questions
- **Admin Dashboard**: Analytics cards (total learners, mentors, active sessions, waiting list count), user management table

### 4. Mentor Assignment System
- When a learner completes their profile, system auto-assigns the mentor with fewest active students
- If no mentor available, learner goes to a waiting list
- Admin can manually reassign mentors

### 5. Landing Page
- Modern, colorful hero section explaining EduBridge
- Feature highlights, call-to-action to register

---

## Phase 2: Features (Next Iteration)

### 6. Learning Resources
- Teachers/Admins upload resources (PDFs, documents, video links)
- Learners browse and view resources
- File upload via Supabase Storage

### 7. Mentorship Sessions
- Mentors create scheduled sessions with date/time
- Learners view their upcoming sessions
- Calendar-style view with status (upcoming, completed, cancelled)

### 8. Q&A System
- Learners post questions
- Mentors respond with threaded answers
- In-app notification when a response is posted

### 9. Notifications
- In-app notification bell with unread count
- Mock email notifications logged for: mentor assignment, session scheduled, question answered

---

## Design Direction
- **Modern & colorful** style with vibrant accent colors and gradients
- Sidebar navigation with role-based menu items
- Metric cards with icons and color accents on dashboards
- Responsive design for mobile and desktop
- Clean typography and generous spacing

## Database Tables
- `users` (via Supabase Auth)
- `user_roles` (role-based access)
- `profiles` (bio, interests, goals)
- `mentor_assignments` (student ↔ mentor)
- `waiting_list` (unassigned students)
- `resources` (learning materials)
- `sessions` (mentorship sessions)
- `questions` & `answers` (Q&A)
- `notifications` (in-app notifications)

## Seed Data
- 1 Admin, 2 Mentors, 3 Learners with sample profiles and data

