"""
test_schema.py - Automated verification test suite for ai-policy-kit Phase P1.
Uses Python standard library unittest + jsonschema + PyYAML.
"""

import json
import pathlib
import unittest
import yaml
import jsonschema


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "schema" / "v0.1" / "ai-policy.schema.json"
PRESETS_DIR = REPO_ROOT / "presets"
DATASET_DIR = REPO_ROOT / "dataset"
POLICIES_DIR = DATASET_DIR / "policies"
SUMMARY_PATH = DATASET_DIR / "summary.json"


class TestAIPolicySchema(unittest.TestCase):
    """Test suite for ai-policy.schema.json and presets."""

    @classmethod
    def setUpClass(cls):
        cls.assertTrue(SCHEMA_PATH.exists(), f"Schema file missing at {SCHEMA_PATH}")
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            cls.schema_data = json.load(f)
        cls.validator = jsonschema.Draft7Validator(cls.schema_data)

    def test_schema_is_valid_draft7(self):
        """Verify that ai-policy.schema.json itself is a valid JSON Schema Draft-07."""
        # check_schema raises jsonschema.SchemaError if invalid
        jsonschema.Draft7Validator.check_schema(self.schema_data)
        self.assertEqual(self.schema_data.get("$schema"), "http://json-schema.org/draft-07/schema#")
        self.assertIn("v0.1", self.schema_data.get("$id", ""))

    def test_preset_strict_valid(self):
        """Verify presets/strict.yml conforms to schema v0.1."""
        strict_path = PRESETS_DIR / "strict.yml"
        self.assertTrue(strict_path.exists())
        with open(strict_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        self.validator.validate(data)
        self.assertEqual(data["level"], "forbidden")
        self.assertEqual(data["categories"]["code"], "forbidden")
        self.assertTrue(data["disclosure"]["required"])
        self.assertTrue(data["accountability"]["author_takes_responsibility"])
        self.assertEqual(data["bots"]["automated_prs"], "forbidden")

    def test_preset_balanced_valid(self):
        """Verify presets/balanced.yml conforms to schema v0.1."""
        balanced_path = PRESETS_DIR / "balanced.yml"
        self.assertTrue(balanced_path.exists())
        with open(balanced_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        self.validator.validate(data)
        self.assertEqual(data["level"], "restricted")
        self.assertEqual(data["categories"]["code"], "restricted")
        self.assertTrue(data["disclosure"]["required"])
        self.assertTrue(data["accountability"]["author_takes_responsibility"])
        self.assertEqual(data["bots"]["automated_prs"], "forbidden")

    def test_preset_permissive_valid(self):
        """Verify presets/permissive.yml conforms to schema v0.1."""
        permissive_path = PRESETS_DIR / "permissive.yml"
        self.assertTrue(permissive_path.exists())
        with open(permissive_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        self.validator.validate(data)
        self.assertEqual(data["level"], "permissive")
        self.assertEqual(data["categories"]["code"], "permissive")
        self.assertFalse(data["disclosure"]["required"])
        self.assertTrue(data["accountability"]["author_takes_responsibility"])
        self.assertEqual(data["bots"]["automated_prs"], "restricted")

    def _base_valid_instance(self):
        """Returns a minimal valid ai-policy configuration dictionary."""
        return {
            "version": "0.1",
            "level": "restricted",
            "categories": {
                "code": "restricted"
            },
            "disclosure": {
                "required": True
            },
            "accountability": {
                "author_takes_responsibility": True
            },
            "bots": {
                "automated_prs": "forbidden"
            }
        }

    def test_negative_invalid_versions(self):
        """Test rejection of non-conforming version strings."""
        for bad_version in ["1.0", "2.0", "v0.1", "0.2", "0.0.1", "alpha"]:
            instance = self._base_valid_instance()
            instance["version"] = bad_version
            with self.assertRaises(jsonschema.ValidationError):
                self.validator.validate(instance)

    def test_negative_valid_version_patterns(self):
        """Test acceptance of valid version patterns: 0.1 and 0.1.x."""
        for good_version in ["0.1", "0.1.0", "0.1.1", "0.1.99"]:
            instance = self._base_valid_instance()
            instance["version"] = good_version
            self.validator.validate(instance)

    def test_negative_invalid_level_enum(self):
        """Test rejection of invalid level enums."""
        for bad_level in ["open", "closed", "strict", "none", 123]:
            instance = self._base_valid_instance()
            instance["level"] = bad_level
            with self.assertRaises(jsonschema.ValidationError):
                self.validator.validate(instance)

    def test_negative_missing_required_top_keys(self):
        """Test rejection when any top-level required property is omitted."""
        required_keys = ["version", "level", "categories", "disclosure", "accountability", "bots"]
        for key in required_keys:
            instance = self._base_valid_instance()
            del instance[key]
            with self.assertRaises(jsonschema.ValidationError) as ctx:
                self.validator.validate(instance)
            self.assertIn(f"'{key}' is a required property", str(ctx.exception))

    def test_negative_additional_top_properties_rejected(self):
        """Test additionalProperties: false rejects unknown top-level keys."""
        instance = self._base_valid_instance()
        instance["unrecognized_field"] = "malicious_payload"
        with self.assertRaises(jsonschema.ValidationError) as ctx:
            self.validator.validate(instance)
        self.assertIn("Additional properties are not allowed", str(ctx.exception))

    def test_negative_missing_categories_code(self):
        """Test that categories without 'code' raises ValidationError."""
        instance = self._base_valid_instance()
        instance["categories"] = {"docs": "permissive"}
        with self.assertRaises(jsonschema.ValidationError) as ctx:
            self.validator.validate(instance)
        self.assertIn("'code' is a required property", str(ctx.exception))

    def test_negative_type_mismatches(self):
        """Test rejection when types do not match boolean / string requirements."""
        # disclosure.required as string
        instance = self._base_valid_instance()
        instance["disclosure"]["required"] = "true"
        with self.assertRaises(jsonschema.ValidationError):
            self.validator.validate(instance)

        # accountability.author_takes_responsibility as integer
        instance = self._base_valid_instance()
        instance["accountability"]["author_takes_responsibility"] = 1
        with self.assertRaises(jsonschema.ValidationError):
            self.validator.validate(instance)

    def test_negative_duplicate_disclosure_methods(self):
        """Test rejection when disclosure.methods contains duplicate values."""
        instance = self._base_valid_instance()
        instance["disclosure"]["methods"] = ["commit_trailer", "commit_trailer"]
        with self.assertRaises(jsonschema.ValidationError) as ctx:
            self.validator.validate(instance)
        self.assertIn("has non-unique elements", str(ctx.exception))


class TestDatasetAndMetadata(unittest.TestCase):
    """Test suite for dataset policy markdown files and summary.json."""

    EXPECTED_POLICY_IDS = [
        "apache", "chromium", "curl", "debian", "django-attrs",
        "eclipse", "fedora", "gentoo", "gitlab", "godot",
        "home-assistant", "immich", "kubernetes", "linux-kernel",
        "mozilla", "netbsd", "nodejs", "openedx", "openssl",
        "openstreetmap", "python-cpython", "pytorch", "qemu",
        "rust-analyzer", "scientific-python"
    ]

    def test_dataset_contains_all_25_policy_files(self):
        """Assert at least 25 policy markdown files exist with non-trivial content."""
        self.assertTrue(POLICIES_DIR.exists(), f"Missing directory {POLICIES_DIR}")
        for pid in self.EXPECTED_POLICY_IDS:
            policy_file = POLICIES_DIR / f"{pid}.md"
            self.assertTrue(policy_file.exists(), f"Policy file missing: {policy_file}")
            content = policy_file.read_text(encoding="utf-8")
            self.assertGreater(len(content), 200, f"Policy file {policy_file} is too short")
            self.assertIn("## Verbatim Policy Text", content)
            self.assertIn("## 4-Dimension Breakdown", content)

    def test_summary_json_integrity(self):
        """Assert dataset/summary.json has correct structure and frequency analysis with 100% dynamic parity."""
        self.assertTrue(SUMMARY_PATH.exists(), f"summary.json missing at {SUMMARY_PATH}")
        with open(SUMMARY_PATH, "r", encoding="utf-8") as f:
            summary = json.load(f)

        policies = summary["policies"]
        total_policies = len(policies)
        self.assertEqual(summary["total_policies_surveyed"], 25)
        self.assertEqual(total_policies, 25)

        # Check that all 25 policy IDs exist in summary
        summary_ids = {p["id"] for p in policies}
        self.assertEqual(summary_ids, set(self.EXPECTED_POLICY_IDS))

        # Programmatically calculate usage levels and frequency counts from policies list
        computed_usage_levels = {"forbidden": 0, "restricted": 0, "permissive": 0}
        counts = {
            "author_takes_responsibility": 0,
            "code_category_defined": 0,
            "comprehension_required": 0,
            "autonomous_prs_restricted_or_forbidden": 0,
            "disclosure_required_or_expected": 0,
            "automated_reviews_restricted_or_forbidden": 0,
            "automated_issues_restricted_or_forbidden": 0,
            "human_discussion_rule_mandated": 0,
            "ai_coauthor_tag_forbidden": 0,
            "commit_trailer_specified": 0,
            "beginner_issues_protected": 0,
        }

        for p in policies:
            # 1. Usage level
            lvl = p.get("usage_regulations", {}).get("level")
            self.assertIn(lvl, computed_usage_levels, f"Invalid level '{lvl}' in policy {p.get('id')}")
            computed_usage_levels[lvl] += 1

            # 2. Comprehension & Accountability
            comp = p.get("comprehension_and_accountability", {})
            if comp.get("author_full_responsibility"):
                counts["author_takes_responsibility"] += 1
            if comp.get("must_understand_code"):
                counts["comprehension_required"] += 1
            if not comp.get("ai_coauthor_permitted", True):
                counts["ai_coauthor_tag_forbidden"] += 1

            # 3. Usage categories
            cats = p.get("usage_regulations", {}).get("categories", {})
            if "code" in cats:
                counts["code_category_defined"] += 1

            # 4. Disclosure requirements
            disc = p.get("disclosure_requirements", {})
            if disc.get("mandatory") or (disc.get("methods") and len(disc.get("methods")) > 0):
                counts["disclosure_required_or_expected"] += 1
            if disc.get("trailer_format") is not None:
                counts["commit_trailer_specified"] += 1

            # 5. Review & Issue rules
            rules = p.get("review_and_issue_rules", {})
            if rules.get("automated_pr_creation") in ("restricted", "forbidden"):
                counts["autonomous_prs_restricted_or_forbidden"] += 1
            if rules.get("automated_review_comments") in ("restricted", "forbidden"):
                counts["automated_reviews_restricted_or_forbidden"] += 1
            if rules.get("automated_issue_creation") in ("restricted", "forbidden"):
                counts["automated_issues_restricted_or_forbidden"] += 1
            if rules.get("human_discussion_rule"):
                counts["human_discussion_rule_mandated"] += 1
            if rules.get("beginner_issues_protected"):
                counts["beginner_issues_protected"] += 1

        # Assert usage_levels in statistics strictly equals dynamically computed tallies
        self.assertEqual(
            summary["statistics"]["usage_levels"],
            computed_usage_levels,
            "Mismatch between statistics.usage_levels and policies dynamic tally"
        )

        # Assert frequency_analysis in statistics strictly equals dynamically computed counts and percentages
        stored_freq = summary["statistics"]["frequency_analysis"]
        self.assertEqual(set(stored_freq.keys()), set(counts.keys()))

        for attr, count in counts.items():
            expected_pct = round((count / total_policies) * 100.0, 1)
            expected_status = "core_attribute (>80%)" if expected_pct > 80.0 else "optional_attribute (<=80%)"

            stored_item = stored_freq[attr]
            self.assertEqual(
                stored_item["count"],
                count,
                f"Count mismatch for '{attr}': stored {stored_item['count']} vs computed {count}"
            )
            self.assertEqual(
                stored_item["percentage"],
                expected_pct,
                f"Percentage mismatch for '{attr}': stored {stored_item['percentage']} vs computed {expected_pct}"
            )
            self.assertEqual(
                stored_item["status"],
                expected_status,
                f"Status mismatch for '{attr}': stored {stored_item['status']} vs expected {expected_status}"
            )

        # Assert all core attributes indeed satisfy >80% threshold
        for attr, item in stored_freq.items():
            if item["status"] == "core_attribute (>80%)":
                self.assertGreater(item["percentage"], 80.0)

        self.assertEqual(summary["statistics"]["schema_representation_coverage_percentage"], 100.0)


if __name__ == "__main__":
    unittest.main()
