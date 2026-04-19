# Test Images

Drop PT prescription images or PDFs here to test the Claude Vision extraction pipeline.

Supported formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

Run the test harness against any image with:

```bash
npm run test:extract -- test-images/<your-file.jpg>
```

Output JSON is saved to `/test-output/<filename>.json`.

This folder is `.gitignore`d — do not commit real patient documents.
