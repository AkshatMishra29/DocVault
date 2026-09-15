# Test Documents for DocVault

These sample files are designed to exercise the real upload, OCR, category detection, expiry detection, search, reminders, sharing, and family features in the DocVault app.

## Recommended usage

1. Generate image versions of these documents for upload testing.
2. Sign up a fresh user in the app.
3. Upload the generated PNG files through the app or via the API script.
4. Use the app to confirm the following:
   - document upload succeeds
   - OCR text is extracted
   - category is detected correctly
   - expiry dates are inferred
   - vault listing works
   - search returns grounded answers
   - reminders show expiring documents
   - family members can be added
   - share links can be created and browsed
   - settings save properly

## Included sources

- health_insurance_policy.txt
- sample_passport.txt
- vehicle_registration_rc.txt

The generator script creates PNG versions from these sources so they can be uploaded through the real document upload API.
