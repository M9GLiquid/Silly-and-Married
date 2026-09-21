# Guest media journey tests

These tests follow what a wedding guest actually does instead of chasing a
coverage number.

- `media-access-journey.test.mjs`: locked page, wrong password, successful
  unlock, protected gallery/API access, and logout.
- `upload-user-journey.test.js`: mixed file selection, duplicate removal,
  invalid and oversized file feedback, and large bounded upload batches.
- `upload-api-errors.test.mjs`: the server repeats the same safe file checks
  and returns actionable messages without contacting OneDrive.
- `media-page-contract.test.js`: the visible upload form retains an explicit
  submit button, removable queue, accessible error region, and correct script
  order.
- `guest-error-popup.test.js`: password visibility and the shared accessible,
  translated popup used by every guest-media error path.

Run everything with `npm test`, or only these journeys with
`npm run test:journeys`.
