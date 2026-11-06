# Authentication clarity, v14

The authentication window uses a black palette with a separate card gallery and a readable form. Terminal styling is restricted to the window chrome. Fields use visible boundaries, persistent labels and clear focus states. Sign-in and signup use a full-width selector; switching also updates the URL. Forgot-password is placed beside the password label.

Signup has one card selection control. The desktop gallery mirrors it. On mobile the preview opens inside the form, renders only when expanded, and supports front/back selection. Optional department information is collapsed. Password confirmation, consent, honeypot, recovery token handling and existing API payloads remain in place. Requests disable fields and all mode-switch buttons until completion. Recovery success now explicitly says the password was renewed.

Validation:

- TypeScript and whitespace checks passed.
- Browser: member login with Enter, wrong-credential alert, loading/disabled state, card-page redirect and logout checked with the existing local fixture.
- Signup: native required fields and password limits retained; name and card radio selection update the preview; mobile preview and optional department disclosure tested. No production accounts created.
- Responsive layout: desktop, medium and narrow widths inspected; no horizontal overflow. Mobile text inputs are 16px.
- Forgot-password and backup-code navigation checked. Admin login fields and actions render in the shared layout.
- Email delivery remains unconfigured; recovery clearly shows that sending is unavailable.
- API routes, schema, roles and card artwork unchanged.
