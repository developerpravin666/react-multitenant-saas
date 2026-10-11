# User documentation

When changing user-facing screens or behavior, update the shared manual at `../MicroservicesEcosystem/docs/accounting-user-manual.md` in the same task. Cover menu/button labels, form fields, permissions, validations, pricing, reports and printed documents with verified step-by-step instructions and expected results. Update the manual version/date when its content changes.

Regenerate the shareable HTML by running `powershell -NoProfile -File ops/Export-UserManual.ps1` from `../MicroservicesEcosystem`. Documentation and distribution guidance is in `../MicroservicesEcosystem/docs/README.md`.
