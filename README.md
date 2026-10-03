# \# LearnX – Exchange. Learn. Grow.

# 

# > \*\*“Give What You Know. Learn What You Need. Grow Together.”\*\*

# 

# LearnX is a peer-to-peer knowledge exchange platform that connects learners with people who can share skills.

# 

# The platform focuses on learning, verified knowledge sharing, peer sessions, skill development, and non-monetary Time Credits.

# 

# \---

# 

# \## 1. Project Overview

# 

# LearnX is built around reciprocal peer learning.

# 

# \### Core Learning Cycle

# 

# \*\*Learn → Share → Earn Time Credits → Learn Again → Grow\*\*

# 

# \### Time Credit System

# 

# \- 1 hour of verified knowledge sharing = 1 Time Credit (TC)

# \- 30 minutes = 0.5 TC

# \- 60 minutes = 1 TC

# \- 90 minutes = 1.5 TC

# \- 120 minutes = 2 TC

# 

# Time Credits are strictly non-monetary.

# 

# They:

# 

# \- Have no cash value

# \- Cannot be withdrawn

# \- Cannot be sold

# \- Cannot be converted into money

# \- Are used only within the LearnX learning ecosystem

# 

# \### Platform Principles

# 

# \- Peer-to-peer learning

# \- Skill exchange

# \- One-to-one learning sessions

# \- AI-assisted skill matching

# \- Verified knowledge sharing

# \- Learning progress tracking

# \- Skill verification

# \- Trust and reliability

# \- No gig marketplace

# \- No bidding system

# \- No social-media-style community feed

# 

# \---

# 

# \# 2. Technology Stack

# 

# \## Frontend

# 

# \- React

# \- TypeScript

# \- Vite

# \- Tailwind CSS

# \- Lucide Icons

# 

# \## Backend

# 

# \- Node.js

# \- Express

# \- TypeScript

# \- REST API

# \- Server-authoritative business logic

# \- Server-Sent Events / polling where applicable

# 

# \## Database

# 

# \- PostgreSQL

# \- Supabase

# 

# The production application uses the cloud PostgreSQL database as the authoritative application data store.

# 

# \## Authentication

# 

# \- Supabase Authentication

# \- Email/password authentication

# \- Email verification

# \- Persistent authentication sessions

# 

# \## AI

# 

# \- Server-side AI integration

# \- Natural-language learning/skill search

# \- Skill matching

# \- Learning recommendations

# \- Learning-plan generation

# \- AI learning assistant

# 

# AI API credentials are kept on the server and are never exposed to the frontend.

# 

# \## Video \& Audio

# 

# \- LiveKit Cloud

# \- WebRTC

# \- Server-generated authentication tokens

# 

# LiveKit credentials are kept server-side.

# 

# \## Email

# 

# \- Resend

# 

# Email API credentials are kept server-side.

# 

# \---

# 

# \# 3. Environment Configuration

# 

# Create a local `.env` file from `.env.example`.

# 

# Never commit `.env` to GitHub.

# 

# Example:

# 

# ```env

# \# Supabase

# VITE\_SUPABASE\_URL=your-supabase-project-url

# VITE\_SUPABASE\_PUBLISHABLE\_KEY=your-supabase-publishable-key

# 

# \# Server-side Supabase credentials

# SUPABASE\_SECRET\_KEY=your-supabase-secret-key

# 

# \# AI

# GEMINI\_API\_KEY=your-gemini-api-key

# 

# \# LiveKit

# LIVEKIT\_URL=your-livekit-url

# LIVEKIT\_API\_KEY=your-livekit-api-key

# LIVEKIT\_API\_SECRET=your-livekit-api-secret

# 

# \# Email

# RESEND\_API\_KEY=your-resend-api-key

# 

# \# Application

# PORT=3000

# APP\_URL=http://localhost:3000

---

## 4. Real Demo Accounts

LearnX can provision a Mentor/Knowledge Sharer and a Learner as real Supabase
Auth accounts with real application records in Supabase PostgreSQL. Provisioning
runs on server startup when both demo password environment variables are set.

Set `LEARNX_DEMO_MENTOR_PASSWORD` and `LEARNX_DEMO_LEARNER_PASSWORD` in Vercel
or another approved secret manager. The default login emails are
`rathika.sri.demo@learnx.test` and `ram.demo@learnx.test`; override them with
`LEARNX_DEMO_MENTOR_EMAIL` and `LEARNX_DEMO_LEARNER_EMAIL` if needed.

The provisioner confirms the accounts' emails, applies the configured
passwords, and ensures real profiles, wallets, availability, reliability,
skills, and skill-catalog entries exist. Re-running it is safe; configured
passwords are reapplied at each server start. Never put password values in
frontend variables, API responses, source control, or logs.

Additional accounts can be provisioned alongside the defaults with
`LEARNX_ADDITIONAL_DEMO_ACCOUNTS_JSON`, set only in a secret manager. Its value
is a JSON array of objects with `email`, `password`, `fullName`, `role`
(`LEARNER`, `MENTOR`, or `KNOWLEDGE_SHARER`), `learnSkills`, and `shareSkills`.
Each skill name is added to the real catalog if it is not already present.
