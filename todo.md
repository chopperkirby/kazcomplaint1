# KazComplaint 2.0 - TODO

## Authentication
- [x] Email/password signup with user persistence
- [x] Email/password login with wrong password error
- [x] Baiterek semi-transparent background on login/signup pages
- [x] Keep Manus OAuth as secondary login option
- [x] Password hashing (bcrypt)

## Home Page
- [x] Lighten dark overlay on hero section
- [x] Login/Signup buttons visible in NavBar (redirects to /auth)

## Complaint Submission
- [x] Video upload support alongside photos
- [x] AI analysis for uploaded videos
- [x] AI analysis for uploaded photos (existing, verified)
- [x] File size validation for videos

## Map Features
- [x] 2GIS map integration
- [x] Map clustering with circles showing problem count
- [x] Circle color coding by criticality level
- [x] Cluster zoom on click

## Employee Dashboard
- [x] City rankings by complaint metrics
- [x] Active/in-progress problems panel
- [x] AI suggestion for complaints
- [x] Staff analytics overview
- [x] Traffic monitoring section

## Traffic Monitoring
- [x] Traffic jam locations display
- [x] Traffic congestion index display
- [x] AI solutions for traffic problems

## Database Schema
- [x] Users table with password hash field
- [x] Complaints table with videoUrls field
- [x] Regions, cities, districts tables
- [x] Complaint votes and comments tables
- [x] Traffic incidents table

## Bug Fixes
- [x] Fix authentication flow (email/password)
- [x] Fix file upload handling (photos + videos)
- [x] Fix map rendering (cluster circles)
- [x] Fix TypeScript errors (0 errors)
- [x] Fix CSS import order (Google Fonts before tailwindcss)
- [x] Fix NavBar login button to use /auth route

## Tests
- [x] Auth logout test (existing)
- [x] Auth me test
- [x] Location regions test
- [x] Complaints updateStatus access control test
- [x] Staff cityRankings access control test
- [x] Staff activeProblems test
- [x] Traffic list/create/resolve tests
- [x] Analytics overview test
