# Availability semantics

A failed upstream fetch creates no observation row. Partial evidence may be stored only with its explicit quality state and missing-field list. Storage failure is reported as storage failure and is never presented as a successful observation.
