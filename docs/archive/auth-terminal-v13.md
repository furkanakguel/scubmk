# Authentication terminal, v13

Member sign-in, signup, backup-code recovery, email recovery and admin sign-in now share a black terminal window. The public pages and card artwork are unchanged.

The command line types on entry, forms animate on mode changes, focused fields use native text carets, and the status bar reflects pending requests or the focused field name. No entered values, passwords, tokens or recovery codes are copied into terminal decoration. Motion can be paused for the session; the OS reduced-motion preference disables animation. Card selection and front/back controls remain manual.

## Validation

- TypeScript: passed.
- Membership integration suite: 59 checks passed against local D1, including signup, roles, card persistence, recovery and sessions.
- Recovery suite: 44 checks passed with isolated SQLite and simulated email transport.
- Browser: existing local member and admin accounts signed in successfully, then signed out. Member sign-in also submitted using Enter. Wrong credentials showed the real API error.
- Signup UI: name updates card preview; radio selection, preview selection and front/back controls agree. Native required fields, password masking and autocomplete attributes retained.
- Responsive checks at 1280×800, 390×844 and 360×800: no horizontal overflow. Mobile fields use 16px text. Form precedes the card preview.
- Pause/resume changes animation state; pause persists across navigation/reload. Reduced motion is handled by the scoped CSS media query.
- Email recovery correctly displays the unavailable-sender state and disables sending. No mail service or credentials were added.

No schema, account permissions or production data were changed by this update.
