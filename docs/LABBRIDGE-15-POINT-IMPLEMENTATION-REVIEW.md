# LabBridge Learn — 15-Point Implementation & Review Tracker

**Approved product direction:** Hybrid clinical + premium technology design  
**Approved theme:** Light theme  
**Repository:** `zekepep45-ai/Labbridge-learn`  
**Default branch:** `main`

## Review rule

A route, component, mock screen, or database table is not proof that a feature is complete. Mark an item **Complete** only after implementation, integration, responsive checks, and a successful functional test. Anything not verified remains **Needs review**.

## Initial repository inventory

The repository is a Next.js 15 / React 19 / TypeScript application with Supabase JS installed. Existing app route folders include academic-review, admin, ai-tutor, certificates, community, courses, exams, lecturer, library, offline, progress, quizzes, revision, study-centre, study-tools, and virtual-lab. Existing components include ExtendedVirtualLab, MarkdownContent, OfflineLessonTools, and PwaRegistration. The homepage and global stylesheet are substantial existing files; preserve them and inspect before replacing.

The browser Supabase client reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Never expose a service-role key in client code.

## 15 workstreams and acceptance criteria

1. **Design system** — Establish documented light-theme tokens for deep navy, medical teal, white, neutral surfaces, typography, spacing, radii, shadows, focus states, buttons, form controls, cards, badges, and motion. Confirm keyboard focus and contrast.
2. **Landing page** — Clear value proposition, course discovery, platform pillars, trust/academic-quality messaging, responsive navigation, and working sign-up/sign-in calls to action.
3. **Navigation and application shell** — Consistent desktop sidebar and mobile navigation, active route state, accessible labels, breadcrumbs where useful, and no dead links.
4. **Student dashboard** — Real learner-specific enrolments, progress, recent activity, recommendations, and useful empty/loading/error states; no fabricated live statistics.
5. **Course library** — Search, filters, categories, course details, learning objectives, modules, lessons, and enrolment flow backed by real data.
6. **MLS curriculum** — Organised Level 100–400 curriculum with structured subjects and modules. Academic content must be sourced and reviewed by qualified educators before publication.
7. **LabBridge AI Tutor** — Secure server-side model calls, useful context-grounded tutoring, loading/error handling, rate/cost controls, and clear educational limitations. No secret keys in browser bundles.
8. **Virtual medical laboratory** — Functional interactive practical simulations, clear instructions, feedback, accessibility, and educational safety boundaries. Do not present simulations as substitutes for supervised practical training.
9. **Examination centre** — Question bank, timed attempts, answer validation, scoring, review, and persisted results. Test timing, refresh, and submission edge cases.
10. **Low-data and offline learning** — PWA/service-worker behaviour, deliberate download controls, cached lesson access, storage/error states, and safe sync when connectivity returns. Test on a real mobile browser.
11. **Visual and multimedia learning** — Responsive diagrams, captions/transcripts, optimised media, meaningful alt text, and reduced-motion support.
12. **Professional development** — Career resources, skills pathways, events/resources, and educator-reviewed materials.
13. **Certificates and achievements** — Evidence-based completion rules, verifiable certificate identifiers, learner history, and download/print checks. Avoid issuing certificates for unverified activity.
14. **Administration and analytics** — Role-protected admin/lecturer workflows, course/content management, moderation/review, and accurate analytics. Verify authorization on the server and through Supabase RLS.
15. **Backend, security, quality and release** — Authentication and session handling, RLS review, input validation, safe error handling, dependency/build/lint checks, accessibility, responsive QA, and production deployment verification.

## Execution sequence

- **Phase 1:** Items 1–4 (design foundation and core learner experience)
- **Phase 2:** Items 5–6 (course discovery and curriculum)
- **Phase 3:** Items 7–9 (AI, virtual lab, assessments)
- **Phase 4:** Items 10–11 (offline and visual learning)
- **Phase 5:** Items 12–13 (professional development and achievements)
- **Phase 6:** Items 14–15 (administration, security, testing and release)

## Morning review checklist

For every item, record:
- What changed (file paths and user-visible behaviour)
- What is genuinely functional versus prototype/demo content
- Tests run and their results
- Known limitations, environment variables, and external service dependencies
- Screenshots or preview URL where available
- Any decision or approval needed from the product owner

## Current status

**Initial repository inventory completed. Full functional audit and all 15 implementation workstreams remain to be completed and verified.** Do not describe all 15 as finished until the acceptance criteria above have been met.
