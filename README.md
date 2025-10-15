# Nested Comments System Backend

A RESTful API for nested comments with JWT authentication, built for IIT Kharagpur students.

## Approach

This backend implements a **Reddit-style nested commenting system** using:
- **JWT authentication** for secure user sessions with 7-day token expiry
- **PostgreSQL + Prisma ORM** for type-safe database operations
- **bcrypt** for secure password hashing (10 salt rounds)
- **Recursive fetching** for unlimited comment nesting depth
- **Role-based access control** (USER/ADMIN) for permission management

**Architecture:** Express.js REST API → Prisma ORM → PostgreSQL Database

## Setup Instructions
1. Install dependencies
npm install

2. Configure environment (.env file)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
DIRECT_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
PORT=3001

3. Setup database
npx prisma generate
npx prisma db push

4. Seed database (optional - 30 users, 500 comments)
npx prisma db seed

5. Start server
npm run dev

##  Features Implemented

### Authentication
-  User registration with email validation (@iitkgp.ac.in only)
-  Secure login with JWT tokens (7-day expiry)
-  Password hashing with bcrypt
-  Token-based authentication middleware

### Comments System
-  Create top-level comments and nested replies (unlimited depth)
-  Recursive comment fetching with full reply trees
-  Upvote functionality
-  Sort comments by "top" (most upvoted) or "new" (latest)
-  Get single comment with all nested replies

### Authorization
-  Role-based access control (USER/ADMIN)
-  Admin-only delete functionality
-  User ownership verification

### Database
-  PostgreSQL with Prisma ORM
-  Auto-incrementing comment IDs
-  UUID-based user IDs
-  Cascade deletion (comments deleted when users are deleted)
-  Pre-seeded with 30 users and 500 comments
