# Imported PDF catalog

52 source entries across the seven supplied PDFs, preserving variants and duplicate names as separate IDs. Each entry retains its source document, page, SHA-256 fingerprint, illustration, description and any source video link. The importer excludes patient/practitioner headers, contact details, footer messages and whole PDFs. Existing source watermarks remain intact.

`index.html` is a standalone searchable review copy. The Expo Exercises tab uses `ExerciseCatalog.js`, `catalog.mjs` and the static image map in `images.js`.

## Age and matching

Four descriptions explicitly refer to a baby: Early Neck Strengthening, Head Control, Neck Rotation Against Adult, and Neck Rotation Supine Stretch. No precise age limits are supplied. All other entries have age suitability marked **not established**. In particular, “Rock the Baby” is an adult-style shoulder movement metaphor, not a pediatric classification, and the “for All Ages” document title is not exercise-specific medical clearance.

The server validates the reported age against questionnaire age bands and includes an explicit age context in Gemini requests and returned draft matches. The Exercises screen displays the age used. Unsupported ages remain unknown; saved follow-up ages are used when the questionnaire age is absent. Old infant follow-ups do not override an updated teen or adult age. Matching also supplies reported activities, equipment, restrictions, discomfort and supervision. Prompt examples distinguish infant matching, unknown ages and a 75+ answer without assuming ability or frailty. These are instruction and validation changes, not model fine-tuning.

The phone's browse list is also filtered using the current saved age: adults and teens see 48 general entries, while a recorded infant sees four source baby entries. Unresolved age or developmental details show a follow-up message. Cached matches from an old age group are hidden, and each displayed match is checked against the current visible catalog. The standalone HTML review copy retains all 52 source entries for catalog review.

For questionnaire answers of Under 13, a developmental-stage follow-up distinguishes an infant under 1 from a child aged 1–12; this user answer does not create clinical age limits. Infant-specific records are excluded for other age groups. For recorded infants, general records without infant guidance are excluded. Photos never establish age suitability. No older-adult difficulty, intensity or dosage adjustments are inferred.

`catalog-policy.mjs` limits candidate IDs using recorded region, movement-specific region corrections, source population, required profile details and symptom-pause state. Unknown age suitability remains unknown. These filters cannot establish clinical appropriateness. Gemini receives permitted source descriptions and age evidence on the server and may return up to five existing IDs, or none. Server validation rejects unknown IDs, out-of-region IDs, infant/population mismatches and selections during symptom pauses. Client-supplied selections or approval flags are ignored.

Selections are separate `catalogSuggestions`, never clinician-approved `routine` records. Guided practice remains locked. Exported example dosages are preserved separately for reference; they are not assigned to this patient or modified to fit a time preference. Source video URLs are opened only on request and have not been verified for availability. The catalog does not claim live provider-library/media access or clinician review.

The chatbot receives the same filtered catalog context. Changing answers triggers a new server match. Gemini credentials stay in the server environment. PDF images are bundled locally; patient photos or identifiers are not sent for image-based age inference.

## Rebuilding and checks

Run `scripts/import_catalog.py` with the bundled Python runtime containing pypdf, pdfplumber and Pillow and the original seven PDFs in Downloads. The importer includes cross-page description continuation. `catalog.test.mjs` checks extracted records, source image availability, source privacy, population guards, candidate-ID validation, and the Gemini/server integration.
