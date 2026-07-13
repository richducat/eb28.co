# App Store Metadata — CadetCatch 1.0.2 Draft

> Status: **BLOCKED / NOT READY TO SUBMIT.** Local candidate 1.0.2 (96) is built and simulator-verified, but screenshots, full next-build QA, App Privacy answers, and App Store Connect agreement/product state remain unresolved. Customer-facing copy below must be checked against the exact archive selected in App Store Connect.

## App Information

- Name: CadetCatch
- Subtitle: Find cadet photos faster
- Bundle ID: `co.eb28.cadetcatch`
- SKU: `cadetcatch-ios`
- Version: 1.0.2
- Build: 96
- Primary category: Lifestyle
- Secondary category: Photo & Video
- Marketing URL: https://cadetcatch.com/
- Support URL: https://cadetcatch.com/support/
- Privacy Policy URL: https://cadetcatch.com/privacy/
- Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Promotional Text

One free preview search, transparent possible matches you review yourself, and simple options for another search, one photo, or monthly family access.

## Description

CadetCatch helps Coast Guard Academy families find photos faster without scrolling through every event gallery by hand.

Add one clear reference photo, run a photo search, and review the possible matches yourself. You decide which matches to view and save to your iPhone Photos library.

Start with one free preview search. After the preview, optional purchases are available through Apple:

- One-Time Photo Check: $1.99 for one additional photo search.
- Unlock One Photo: $1.99 to view, save, and share one matched photo.
- Family Monthly: $12.99/month for continuous photo searches and unlocked matches while active.

Prices may vary by storefront and are confirmed before purchase. Family Monthly renews automatically until canceled in Apple subscription settings. Restore Purchases, Privacy Policy, and Terms of Use are available in the app.

CadetCatch shows possible matches, not confirmed identifications. Review every result yourself.

CadetCatch is an independent app and is not affiliated with, endorsed by, or connected to the U.S. Coast Guard Academy, the U.S. Coast Guard, or the Department of Homeland Security.

Privacy Policy: https://cadetcatch.com/privacy/
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Keywords

cadet,academy,photos,family,parents,coast,uscga,event,search

## What's New

One free preview search is now explained more clearly, along with transparent possible-match review and current purchase options. Privacy and support links now use cadetcatch.com.

## Reviewer-Facing Summary

CadetCatch is an iPhone app for Coast Guard Academy families. A user adds one clear reference photo, starts a photo search, and reviews possible matches returned by CadetCatch. The user—not the app—decides whether a result is a match. One preview search is free. Additional options are a $1.99 one-time search, a $1.99 single-photo unlock, and $12.99/month Family Monthly access.

No login is required for the core photo-search flow. The reviewer notes in `review-notes.md` remain a draft until the exact build is uploaded and tested.

## Submission Snapshot

- Release type: Manual
- Exact build attached: **No — build 96 has not been uploaded**
- iPhone screenshots for exact build: **No — unresolved**
- iPad screenshots: Not planned; Xcode target must remain iPhone-only
- Login required: No for the core photo-search flow
- Subscriptions present: Yes
- Ads present: No
- App Privacy current for exact build: **No — unresolved**
- Export compliance reviewed for exact build: **No — unresolved**
- Paid Apps Agreement and product availability verified now: **No — unresolved**
- App Store submission: Build 96 is not uploaded and not submitted

## Internal Launch Notes

- Live App Store check on 2026-07-10 returned CadetCatch version 1.0.1, released 2026-06-30, with an App Store description still linking to `https://eb28.co/cc/privacy/`.
- The last known current release source declares version 1.0.1 build 95 and implements one free preview search plus the three `.v1` products listed above.
- This isolated origin/main worktree contains an older Xcode target declaring version 1.0.0 build 2 and `co.eb28.cadetcatch.pro.monthly`; it cannot be used as the next release source without reconciling the current shipping implementation.
- Local build 96 replaces the in-app EB28 Privacy and Support links with `https://cadetcatch.com/privacy/` and `https://cadetcatch.com/support/`.
- Do not add desktop or invitation copy to the description, What's New text, screenshots, or reviewer notes for this release.
- Existing screenshot files remain on disk for historical context only. None are approved or referenced for 1.0.2 until captured from and compared with the exact next build.
- Before submission, complete fresh-install and production StoreKit QA, update App Privacy, capture exact-build screenshots, verify the review notes against build 96, and rerun `app_store_preflight.py` to a zero-error result.
