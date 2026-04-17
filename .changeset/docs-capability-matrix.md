---
"@mxerf/tappt": patch
---

Documentation: added a capability matrix (what each backend actually delivers per method) and a "Known limitations" section to both the English and Russian README. Notably clarifies that **iOS Safari cannot differentiate impact styles** — all five `impact()` values produce the same Taptic pulse because the `<input type="checkbox" switch>` element exposes only one haptic kind. No behaviour change.
