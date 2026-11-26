# LabBridge Learn

LabBridge is a Ghana-first Medical Laboratory Science (MLS) technology ecosystem. **LabBridge Learn** is its first product: a learning space for MLS students and early-career laboratory professionals.

## Product direction

- Clear, accessible MLS learning resources.
- Course-based learning paths, topics, and study progress.
- Practical knowledge checks and revision tools.
- A foundation that can later connect to the wider LabBridge ecosystem.

## Technology

- Next.js App Router
- React and TypeScript
- CSS for the initial responsive interface
- Supabase for authentication and data (existing project: `labbridge-learn`)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Safety and scope

- Do not enter real patient information or identifiable clinical data.
- Keep the LabBridge project separate from Instivora and MLS Attendance–TTU.
- Preserve and review Supabase Row Level Security (RLS) before connecting application features.
- Never expose a Supabase service-role key in browser code.

## Status

The initial interface scaffold is being established. Database infrastructure exists in Supabase; application integration and deployment are separate next steps.
