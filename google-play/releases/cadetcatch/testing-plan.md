# CadetCatch Android Testing Plan

## Track Order

1. Local emulator QA.
2. Internal testing in Play Console.
3. Closed testing if the Play account requires it.
4. Production review only after all receipts are recorded.

## Required Test Accounts

- richducat@gmail.com
- richard@thankyouforyourservice.co
- karen@thankyouforyourservice.co
- fishkn@upmc.edu

## Emulator QA

- Launch app.
- Save account email and check access status.
- Pick a clear cadet photo.
- Run High, Medium, and Low match ranges.
- Confirm the app sends `file`, `top_k`, `min_score`, and `face_index`.
- Confirm result cards load from `photo_url`.
- Confirm failed thumbnails keep the card and allow opening the full photo.
- Save a matched photo to Gallery.
- Capture screenshots and logcat.

## Billing QA

- Add Google license testers.
- Configure product `co.eb28.cadetcatch.family.monthly.v1` or the closest allowed Play product ID.
- Purchase subscription in test mode.
- Verify backend grants active access only after Google Play token verification.
- Verify canceled/expired/revoked access fails closed.
