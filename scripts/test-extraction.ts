import * as fs from "fs";
import * as path from "path";
import { extractPTExercises } from "../lib/claude/extract-pt";

// Load .env.local manually (tsx doesn't auto-load it)
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error("Usage: npm run test:extract -- <path-to-image>");
    console.error("Example: npm run test:extract -- test-images/prescription.jpg");
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), imagePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`\nExtracting PT exercises from: ${resolvedPath}`);
  console.log("─".repeat(60));

  const start = Date.now();
  const result = await extractPTExercises(resolvedPath);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`\nExecution time: ${elapsed}s`);

  if (result.success) {
    console.log(`Exercises extracted: ${result.exercises.length}`);
    if (result.reason) {
      console.log(`Note: ${result.reason}`);
    }
  } else {
    console.error(`\nExtraction failed: ${result.error}`);
    if (result.validationErrors) {
      console.error("\nValidation errors:");
      console.error(JSON.stringify(result.validationErrors.issues, null, 2));
    }
    if (result.rawResponse) {
      console.error("\nRaw response from Claude:");
      console.error(result.rawResponse);
    }
  }

  // Save output to test-output/
  const outputDir = path.resolve(process.cwd(), "test-output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseName = path.basename(imagePath, path.extname(imagePath));
  const outputPath = path.join(outputDir, `${baseName}.json`);

  const outputPayload = {
    source_file: imagePath,
    extracted_at: new Date().toISOString(),
    elapsed_seconds: parseFloat(elapsed),
    result,
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), "utf-8");
  console.log(`\nOutput saved to: ${outputPath}`);

  if (result.success && result.exercises.length > 0) {
    console.log("\nExtracted exercises:");
    console.log("─".repeat(60));
    result.exercises.forEach((ex) => {
      const details = [
        ex.reps ? `${ex.reps} reps` : null,
        ex.sets ? `${ex.sets} sets` : null,
        ex.duration_seconds ? `${ex.duration_seconds}s hold` : null,
      ]
        .filter(Boolean)
        .join(", ");
      console.log(
        `  ${ex.step_number}. ${ex.name} (${ex.position})${details ? ` — ${details}` : ""}`
      );
      if (ex.primary_body_parts.length) {
        console.log(`     Body parts: ${ex.primary_body_parts.join(", ")}`);
      }
      if (ex.form_cues.length) {
        console.log(`     Cues: ${ex.form_cues.slice(0, 2).join("; ")}${ex.form_cues.length > 2 ? " …" : ""}`);
      }
    });
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
