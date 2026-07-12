# CadetCatch App Store Screenshot Storyboard

Dominant archetype: outcome headline plus oversized real product UI.

## Frame Order

1. **Find cadet photos faster.**
   Review likely event photos together, without scrolling every gallery.
   UI: New possible-match grid populated from the CadetCatch search API.

2. **Start every search from one place.**
   Choose your cadet, confirm the collection, and begin from Home.
   UI: Home dashboard with the selected cadet, collection status, and search controls.

3. **Open it. Save it. Keep the moment.**
   Save the full matched photo directly to the iPhone Photos library.
   UI: Full photo review with Open Full Photo and Save to Photos.

4. **Choose how broad to search.**
   High, Medium, and Low help with clear portraits, side angles, and lookalikes.
   UI: Tight crop of the live Match range control.

5. **Keep your cadet ready to search.**
   One organized profile keeps every photo search focused.
   UI: Cadet roster with two organized profiles and one active selection.

6. **Know what makes a better match.**
   Clear tips explain reference photos, tough angles, and careful review.
   UI: Parent-facing Info guidance.

## Coverage

- iPhone 6.9-inch portrait: 1320 x 2868
- iPhone 6.5-inch portrait: 1284 x 2778
- Locale: en-US
- App target: iPhone only
- Source UI: CadetCatch 1.0.2 build 96 at `a9fea7e321f48fec59e87bcca2ccb4e73462a952`
- Capture device: iPhone 17 Pro Max simulator on iOS 26.5

## Capture Integrity

- Every device image is a live Simulator capture from the build-96 source.
- The first ten results from a verified `POST https://api.cadetcatch.com/search` response were seeded into local Simulator preferences for deterministic capture.
- The supplied test profile returned 13 possible matches at `min_score=0.55`; the App Store frames show the first ten.
- A `#if DEBUG` launch hook opens the first photo-detail sheet for capture. Release behavior is unchanged.
- The profile test asset remains local and is not included as a standalone marketing file.
- No ratings, testimonials, government endorsement, unshipped desktop feature, or unsupported identification claim appears in the set.
