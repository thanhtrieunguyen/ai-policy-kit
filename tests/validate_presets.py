#!/usr/bin/env python3
"""
CLI validation runner for ai-policy-kit presets.
Validates all canonical presets against schema/v0.1/ai-policy.schema.json.
Exits with code 0 on complete success, or non-zero on validation failure.
"""

import sys
import json
import pathlib
import yaml
import jsonschema


def main() -> int:
    repo_root = pathlib.Path(__file__).resolve().parent.parent
    schema_path = repo_root / "schema" / "v0.1" / "ai-policy.schema.json"
    presets_dir = repo_root / "presets"

    print("==================================================")
    print(" AI Policy Kit - Presets Validation Runner")
    print("==================================================")
    print(f"Repository Root : {repo_root}")
    print(f"Schema Location : {schema_path}")
    print(f"Presets Directory: {presets_dir}")
    print("--------------------------------------------------")

    if not schema_path.exists():
        print(f"[FAIL] Schema not found at: {schema_path}", file=sys.stderr)
        return 1

    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_data = json.load(f)
    except Exception as exc:
        print(f"[FAIL] Failed to parse schema JSON: {exc}", file=sys.stderr)
        return 1

    # Verify Draft-07 compliance of the schema itself
    try:
        jsonschema.Draft7Validator.check_schema(schema_data)
        validator = jsonschema.Draft7Validator(schema_data)
        print("[OK] Schema is valid Draft-07 JSON Schema.")
    except jsonschema.SchemaError as exc:
        print(f"[FAIL] Meta-schema error in ai-policy.schema.json: {exc.message}", file=sys.stderr)
        return 1

    preset_files = ["strict.yml", "balanced.yml", "permissive.yml"]
    failed = False

    for preset_name in preset_files:
        preset_path = presets_dir / preset_name
        if not preset_path.exists():
            print(f"[FAIL] Preset file missing: {preset_path}", file=sys.stderr)
            failed = True
            continue

        try:
            with open(preset_path, "r", encoding="utf-8") as f:
                preset_data = yaml.safe_load(f)
        except Exception as exc:
            print(f"[FAIL] Error parsing YAML from {preset_name}: {exc}", file=sys.stderr)
            failed = True
            continue

        errors = list(validator.iter_errors(preset_data))
        if errors:
            print(f"[FAIL] {preset_name} failed validation:", file=sys.stderr)
            for err in errors:
                print(f"       - Field: '{'.'.join(str(p) for p in err.path)}' -> {err.message}", file=sys.stderr)
            failed = True
        else:
            print(f"[PASS] {preset_name} conforms to schema v0.1.")

    print("--------------------------------------------------")
    if failed:
        print("[RESULT] VALIDATION FAILED - One or more presets are invalid.", file=sys.stderr)
        return 1

    print("[RESULT] SUCCESS - All presets are valid against ai-policy.schema.json v0.1!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
