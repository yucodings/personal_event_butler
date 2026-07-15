# Skyler - Personal Butler

A personal event and task management assistant powered by AI. Skyler helps you manage deadlines, exams, assignments, and events with smart AI extraction, Telegram notifications, and Google Calendar sync.

## Features

### Dashboard
- Event cards with type icons (Event, Assignment, Exam, Competition, Task)
- Filter by type, sort by date/name/priority
- Search events by title or description
- Floating add button for quick event creation
- Mark events as done, edit, or delete

### Calendar
- Three views: Daily, Weekly, Monthly
- Period bands for named time periods (e.g., "Week 1", "Semester A")
- Click any date to add events
- Navigation controls and Today button

### Skyler AI Agent
- Chat interface for natural language interaction
- Query events: "What's due this week?"
- Create events: "Add an exam for Math on July 20"
- Modify events: "Move my exam to July 21"
- File upload with OCR (images) and text extraction (PDF, DOC, TXT)
- Automatic advice based on priorities
- Confirmation cards for event creation/modification
- One-by-one review flow for multiple extracted events

### Documents
- Upload files (images, PDF, Word, Text)
- Client-side OCR for images (Tesseract.js)
- Server-side text extraction for PDF/DOC
- AI-powered event extraction from documents
- Document storage with OCR text and processed content
- Link events to source documents

### Telegram Notifications
- Daily summaries at 8am and 8pm (UTC+8)
- Event count for today, tomorrow, and upcoming
- Days until deadline
- Priority-based advice
- Test connection functionality

### Google Calendar Integration
- One-way sync (Google Calendar → Skyler)
- OAuth2 authentication
- Automatic holiday filtering
- Sync all calendars
- Manual sync button

### Settings
- MiMo API status (hidden for security)
- Telegram configuration
- Google Calendar connection
- Database status

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| AI Model | Xiaomi MiMo v2.5 (Token Plan) |
| OCR | Tesseract.js (client-side) |
| Notifications | Telegram Bot API |
| Calendar Sync | Google Calendar API |
| Auth | JWT (HTTP-only cookies) |
| Hosting | Vercel |

## Project Structure

```
skyler/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx          # Login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Dashboard layout with sidebar
│   │   │   ├── page.tsx                # Dashboard (event cards)
│   │   │   ├── calendar/page.tsx       # Calendar view
│   │   │   ├── skyler/page.tsx         # AI agent chat
│   │   │   ├── documents/page.tsx      # File upload & management
│   │   │   ├── history/page.tsx        # Past events
│   │   │   └── settings/
│   │   │       ├── page.tsx            # Settings wrapper
│   │   │       └── settings-content.tsx # Settings content
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts      # Login endpoint
│   │   │   │   └── logout/route.ts     # Logout endpoint
│   │   │   ├── events/
│   │   │   │   ├── route.ts            # Event CRUD
│   │   │   │   └── [id]/route.ts       # Single event operations
│   │   │   ├── periods/
│   │   │   │   ├── route.ts            # Period CRUD
│   │   │   │   └── [id]/route.ts       # Single period operations
│   │   │   ├── documents/
│   │   │   │   ├── route.ts            # Document upload & list
│   │   │   │   └── [id]/route.ts       # Document detail & delete
│   │   │   ├── ai/
│   │   │   │   ├── chat/route.ts       # AI chat with context
│   │   │   │   └── extract/route.ts    # Text extraction
│   │   │   ├── google/
│   │   │   │   ├── auth/route.ts       # Google OAuth URL
│   │   │   │   ├── callback/route.ts   # OAuth callback
│   │   │   │   └── sync/route.ts       # Calendar sync
│   │   │   ├── settings/route.ts       # Settings CRUD
│   │   │   └── telegram/
│   │   │       └── notify/route.ts     # Telegram notifications
│   │   ├── layout.tsx                  # Root layout
│   │   └── globals.css                 # Global styles
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── sidebar.tsx             # Navigation sidebar
│   │   │   ├── event-card.tsx          # Event display card
│   │   │   └── event-form.tsx          # Event create/edit form
│   │   ├── documents/
│   │   │   ├── upload-area.tsx         # File upload with drag & drop
│   │   │   ├── document-list.tsx       # Document list
│   │   │   └── document-detail.tsx     # Document detail view
│   │   ├── providers/
│   │   │   └── telegram-scheduler-provider.tsx
│   │   └── ui/                         # shadcn components
│   ├── hooks/
│   │   └── use-telegram-scheduler.ts   # Client-side notification timer
│   ├── lib/
│   │   ├── auth.ts                     # JWT authentication
│   │   ├── supabase.ts                 # Supabase client
│   │   ├── mimo.ts                     # MiMo AI API client
│   │   ├── ocr.ts                      # Tesseract.js OCR
│   │   ├── telegram.ts                 # Telegram Bot API
│   │   ├── google-calendar.ts          # Google Calendar API
│   │   └── utils.ts                    # Utility functions
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   └── middleware.ts                   # Auth middleware
├── public/
├── supabase-setup.sql                  # Database schema
├── vercel.json                         # Vercel cron config
├── .env.example                        # Environment variables template
└── package.json
```

## Database Schema

### events
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Event title |
| description | TEXT | Event details |
| type | TEXT | event/assignment/exam/competition/task |
| date | DATE | Event date |
| time | TIME | Event time (optional) |
| priority | TEXT | low/medium/high |
| status | TEXT | ongoing/done |
| document_id | UUID | Link to source document |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### documents
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| file_name | TEXT | Original filename |
| file_type | TEXT | image/pdf/doc/txt |
| ocr_text | TEXT | Extracted raw text |
| processed_text | TEXT | AI-processed summary |
| events_count | INTEGER | Number of extracted events |
| created_at | TIMESTAMPTZ | Upload timestamp |

### periods
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Period name (e.g., "Week 1") |
| start_date | DATE | Start date |
| end_date | DATE | End date |
| color | TEXT | Hex color for calendar band |
| created_at | TIMESTAMPTZ | Creation timestamp |

### settings
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| key | TEXT | Setting key (unique) |
| value | TEXT | Setting value |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | Validate password, set JWT |
| `/api/auth/logout` | POST | Clear auth cookie |
| `/api/events` | GET | List events (filter by status, type) |
| `/api/events` | POST | Create event |
| `/api/events/[id]` | GET/PUT/DELETE | Single event operations |
| `/api/periods` | GET/POST | List/Create periods |
| `/api/periods/[id]` | PUT/DELETE | Update/Delete period |
| `/api/documents` | GET | List documents |
| `/api/documents` | POST | Upload document |
| `/api/documents/[id]` | GET/DELETE | Document detail/Delete |
| `/api/ai/chat` | POST | AI chat with context |
| `/api/ai/extract` | POST | Extract events from text |
| `/api/google/auth` | GET | Get Google OAuth URL |
| `/api/google/callback` | GET | OAuth callback |
| `/api/google/sync` | POST | Sync Google Calendar |
| `/api/settings` | GET/PUT | Read/Update settings |
| `/api/telegram/notify` | POST | Send Telegram notification |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase public API key |
| `MIMO_API_KEY` | Yes | Xiaomi MiMo API key |
| `MIMO_BASE_URL` | No | Custom MiMo endpoint (auto-detected) |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `LOGIN_PASSWORD` | Yes | Dashboard login password |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID |
| `GOOGLE_CLIENT_ID` | No | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | No | Google OAuth redirect URI |
| `NEXT_PUBLIC_APP_URL` | No | App URL for callbacks |

## Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/yucodings/personal_event_butler.git
cd personal_event_butler
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the contents of `supabase-setup.sql`
4. Get your project URL and API key from Settings → API

### 4. Set Up MiMo API
1. Go to [MiMo Platform](https://platform.xiaomimimo.com)
2. Create an API key (Token Plan recommended)
3. Copy the API key

### 5. Configure Environment Variables
Create `.env.local`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
MIMO_API_KEY=tp-xxxxx
JWT_SECRET=your-random-secret
LOGIN_PASSWORD=your-password
```

### 6. Run Development Server
```bash
npm run dev
```

### 7. Deploy to Vercel
```bash
npx vercel --prod
```

Add environment variables in Vercel dashboard.

## Telegram Setup

1. Open Telegram, search for @BotFather
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Send any message to your bot
5. Visit `https://api.telegram.org/botYOUR_TOKEN/getUpdates` to find your chat ID
6. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to Vercel env vars

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project
3. Enable **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set redirect URI to `https://your-domain.vercel.app/api/google/callback`
6. Copy Client ID and Client Secret
7. Add to Vercel env vars
8. Go to Settings page and click "Connect Google Calendar"

## Telegram Message Format

```
📋 Daily Summary - July 15, 2026

🔴 TODAY (2 events):
📅 Math Assignment @ 23:59 (HIGH)
📖 CS101 Midterm @ 10:00 (HIGH)

🟡 TOMORROW (1 event):
📝 Physics Lab Report (MEDIUM)

📌 UPCOMING (5 events):
📝 DE - Group Assignment 1 - Jul 18 (in 3 days)
📖 DE - Take-Home Quiz - Jul 20 (in 5 days) ⚠️ DUE
📖 DE - Mid-Term Exam - Jul 27 (in 12 days) ⚠️ DUE

💡 Advice:
• You have 2 high priority tasks today - focus on these first!
```

## AI Extraction Flow

1. User uploads file or describes event
2. For images: Client-side OCR (Tesseract.js)
3. For PDF/DOC: Server-side text extraction
4. Text sent to MiMo AI for analysis
5. AI returns structured event data
6. User reviews extracted events one by one
7. Confirmed events saved to database

## License

Private project for personal use.

## Author

Built by Yu Codings
