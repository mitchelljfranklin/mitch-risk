# Bundled PDF fonts

These fonts are embedded so generated PDFs can render every shipped locale.
`@react-pdf/renderer` has no per-glyph fallback, so `lib/pdf/fonts.ts` selects a
family from the PDF locale.

| Family | Files | Source |
|---|---|---|
| Noto Sans | `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf` | <https://github.com/notofonts/noto-fonts> |
| Noto Sans Arabic | `NotoSansArabic-Regular.ttf`, `NotoSansArabic-Bold.ttf` | <https://github.com/notofonts/noto-fonts> |
| Noto Sans Devanagari | `NotoSansDevanagari-Regular.ttf`, `NotoSansDevanagari-Bold.ttf` | <https://github.com/notofonts/noto-fonts> |
| Noto Sans JP | `NotoSansJP-Regular.otf`, `NotoSansJP-Bold.otf` | <https://github.com/notofonts/noto-cjk> |
| Noto Sans KR | `NotoSansKR-Regular.otf`, `NotoSansKR-Bold.otf` | <https://github.com/notofonts/noto-cjk> |
| Noto Sans SC | `NotoSansSC-Regular.otf`, `NotoSansSC-Bold.otf` | <https://github.com/notofonts/noto-cjk> |

All files are unmodified and licensed under the SIL Open Font License 1.1; see
[`OFL.txt`](./OFL.txt). Keep that license file when adding or replacing fonts.

The CJK files are the regional SubsetOTF builds, not the full pan-CJK fonts.
They add roughly 36 MB to the repository/image. The standalone Docker build
copies this directory via `outputFileTracingIncludes` in `next.config.ts`.
