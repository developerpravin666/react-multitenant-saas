# Dynamic Form Control Platform

Supported controls:
- Text, Email, Password
- Number, Telephone, URL
- Textarea
- Single Select
- Multi Select with chips and max-selection support
- Radio group
- Checkbox
- Accessible Toggle/Switch
- Date, Time, DateTime
- Month, Week
- Color
- Range/Slider
- File upload
- Hidden metadata

Architecture:
1. `types/form.ts` defines discriminated configuration types.
2. `fields/` contains isolated renderers.
3. `registry/fieldRegistry.tsx` maps control type to renderer.
4. `validation/schemaFactory.ts` generates Zod validation from the same config.
5. `DynamicForm.tsx` composes React Hook Form with the registry.

To add a new control:
- Add its config type.
- Implement its renderer.
- Add its schema case.
- Register it.
Existing controls do not need to change.

For enterprise scale, convert the registry into a plugin contract so feature packages can contribute `{ type, component, schemaBuilder }`.
