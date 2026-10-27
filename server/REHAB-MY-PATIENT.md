# Rehab My Patient connection

The server reads assigned exercise plans through the documented HTTPS API. It never creates, updates, deletes, or emails provider records. The model cannot choose endpoints, patient IDs, URLs, or credentials.

Save private settings in `server/.env.rehabmypatient` (excluded from source archives):

```
RMP_API_KEY=your-private-key
RMP_PATIENT_LINKS={"synthetic-demo":{"patientId":"YOUR_FICTIONAL_PATIENT_ID","synthetic":true}}
```

Optionally add `"planId":"YOUR_PLAN_ID"` to that mapping to limit the imported plan. Production mappings must use the authenticated user's subject in place of `synthetic-demo`. Never map a real patient to the shared fictional demo. Restart the server after updating settings.

Both Gemini chat and structured support-plan organization receive only the mapped plan's exercise names and exact descriptions, plus source references and verification status. Patient names, contact details, date of birth, practitioner details and plan notes are omitted. Exercise text is treated as untrusted reference material, not model instructions. The current Gemini organizer still returns only allowlisted organizational suggestion IDs.

The plan screen displays the imported instructions separately. Assignment does not establish home-practice clearance, so these imports never unlock guided practice or become clinician-approved routine records. The API documentation does not provide a general exercise-library search or demonstration-media endpoint; no images, videos or media rights are inferred.

At most three plans from the provider's first page are imported per request, with a truncation indicator. No account-wide patient list is retrieved during chat or generation. Cross-patient records, mismatched details, redirects and oversized responses fail closed. Provider failures show an unavailable state while support generation remains available.

Documentation: https://www.rehabmypatient.com/api-documentation
