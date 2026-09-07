# InternHub

A role-based intern management portal (HR / Manager / Intern) built with React, Vite, React Router, and Firebase (Auth + Firestore).

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env` and fill in your Firebase web app config (already present for this project — see Firebase console → Project settings → General → Your apps):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   `.env` is gitignored — never commit it. (Firebase web API keys are not secret by design, but access is only actually restricted by the security rules below, so treat rules — not the key — as the real boundary.)
3. Run the dev server:
   ```
   npm run dev
   ```

## Deploying Firestore security rules

This repo includes `firestore.rules`, `firestore.indexes.json`, and `firebase.json`. **The app has no server — every access-control decision that matters is enforced by these rules, not by the React code.** The `ProtectedRoute` component only hides UI; it does not stop a signed-in user from calling Firestore directly. Deploy the rules before treating any environment as real:

```
npm install -g firebase-tools   # once
firebase login
firebase use internhub-217a6    # or your project id
firebase deploy --only firestore:rules
```

Until the rules are deployed, whatever ruleset already exists on the Firebase project is what governs access — check the Firebase console (Firestore → Rules) if you're unsure what's live.

## Data model

All collections are top-level. Roles and ownership are enforced in `firestore.rules`.

### `users/{uid}`
Doc id = Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `role` | `"hr" \| "manager" \| "intern"` | Set by HR at provisioning time; immutable by the user themselves. |
| `name` | string | |
| `email` | string | |
| `managerId` | string (uid) | Interns only. Set by HR via **HR → All Interns**. |
| `onboardingChecklist` | array | Intern-owned; the only field an intern may write on their own doc besides `onboardingStep`. |
| `onboardingStep` | number | |

There is currently no in-app account-creation flow — new `users/{uid}` docs (and the matching Firebase Auth account) must be created by HR directly in the Firebase console or via the Admin SDK. This is the biggest remaining gap for real onboarding; see "Known gaps" below.

### `tasks/{taskId}`
| Field | Type | Notes |
|---|---|---|
| `title`, `description`, `dueDate`, `priority` | string | Set by the assigning manager (or HR). |
| `status` | `"pending" \| "in-progress" \| "completed"` | Manager/HR can change any field; the assigned intern may only change `status`. |
| `internId` | string (uid) | Must belong to an intern managed by the creating manager. |
| `managerId` | string (uid) | Must equal the creator's uid (unless HR). |
| `createdAt`, `updatedAt` | ISO string | |

### `attendance/{internId}_{yyyy-mm-dd}`
Doc id is deterministic (`internId_date`) so an intern can only ever have one record per day, and rules can verify the id matches the writer.

| Field | Type | Notes |
|---|---|---|
| `internId` | string (uid) | Owner; only that intern (or HR) can create the record. |
| `date` | `yyyy-mm-dd` | |
| `status` | `"present" \| "late" \| "absent"` | Intern sets on check-in; manager/HR may correct it. |
| `checkIn`, `checkOut` | ISO string \| null | |
| `note` | string | Intern-authored. |
| `managerComment`, `managerCommentUpdatedAt`, `reviewedByManagerAt` | | Manager/HR-authored only. |

### `applications/{applicationId}`
HR-only recruitment pipeline (`status`/`stage`, `reviewedAt`, `reviewedBy`, candidate fields). Nothing in this app writes new applications — they're expected to be seeded/imported by HR.

## Known gaps

- No in-app flow to create HR/manager/intern accounts — do this in the Firebase console (Auth: add user; Firestore: create the matching `users/{uid}` doc with a `role`).
- `/hr/reports` is a placeholder screen (`SectionPlaceholder`) pending a real reports feature.
- No automated tests yet.
