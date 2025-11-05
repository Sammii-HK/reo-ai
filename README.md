# Reo Landing Page

A beautiful, minimal landing page for Reo - the conversational life tracker.

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** components
- **MailerLite** for email collection

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
MAILERLITE_API_KEY=your_mailerlite_api_key
MAILERLITE_AUDIENCE_ID=your_audience_id (optional)
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## Getting MailerLite API Credentials

1. Sign up for a free MailerLite account: https://www.mailerlite.com/
2. Go to Settings > Developers > API
3. Copy your API key
4. Create a group/audience for the waitlist
5. Copy the group ID (optional - if not provided, subscribers go to default group)

## MailerLite Free Tier

- 1,000 subscribers
- 12,000 emails/month
- Perfect for early stage waitlist collection

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The project is optimized for Vercel's platform and will deploy automatically on push.

## Project Structure

```
reo-ai/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── api/
│   │   └── waitlist/
│   │       └── route.ts    # Email collection API
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Hero.tsx           # Hero section
│   ├── Problem.tsx        # Problem section
│   ├── Solution.tsx       # Solution comparison
│   ├── Features.tsx       # Features preview
│   ├── WaitlistForm.tsx   # Email form
│   └── Footer.tsx         # Footer
└── lib/
    ├── utils.ts           # Utility functions
    └── email.ts           # MailerLite integration
```
