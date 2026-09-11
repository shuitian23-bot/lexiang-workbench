# Independent scenario review implementation plan

1. Domain/store: implement submission, independent review, rejection and resubmission with failing tests first; close direct self-publication and add a named review example. Owner: compose_editor.
2. Creation: change final step to submission, support rejected-draft editing, preserve composition and inputs. Owner: creation_flow_review.
3. Skill Hub: add a review tab and type filter, pending/rejected states, review details and actions, submission navigation and resubmission entry. Owner: root.
4. Run domain/store regressions, design guard, lint, typecheck, build and shell smoke. Verify browser flows and independent code review.
5. Update the grouped functional log, commit isolated source, compare local/server builds and publish new only with backups and protected fingerprints. Archive release evidence.

## Review location correction

Remove the separate Review tab and mixed list. Use the existing Scenario package pending filter and permission-checked row Review action; preserve the dialog and domain/store review gates. Redirect former review links to the package pending list. Update only existing invalid tab-contract assertions, verify the local UI and publish to new only.

## Scenario usage description correction

Remove trigger and completionCriteria from form, summary, detail, domain validation and package metadata, including older records. Align package list and search with the scenario description. Make description examples explain applicability, expected results and usage boundaries. Verify submission/publishing without either obsolete field, nonempty description requirements and preservation of user-entered descriptions. Retain independent review and the package-management entry. Verify local browser, project checks and new-only release.
