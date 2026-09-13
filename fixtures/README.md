# Fixture mode

When a workflow runs this Action **without an `api-key`**, it does not talk to DecimalAI at all. It
renders the report in `impact_report.json` — the seeded demo agent from the
[two-minute demo](https://docs.decimal.ai/tutorials/two-minute-demo), captured from a real run of
`decimalai demo regression` — and posts the same PR comment a real run would post, with a banner as
its first line saying it is sample data. The job never fails in fixture mode, whatever `fail-on`
says: a demo must not red a stranger's pull request.

That is the whole point: a reader can see the Action's output on their own repository before
creating an account. Add `api-key: ${{ secrets.DECIMAL_API_KEY }}` and the same workflow runs against
the agent's real traces.

| file | what it is |
|---|---|
| `impact_report.json` | the captured `RegressionCheckResponse` (2 high / 118 medium / 0 low over 120 traces, six manifest changes); ids, hashes, timestamps and `pr_context` are placeholders |

The `_README` key inside the JSON carries the capture recipe. `tests/fixture_contract.test.ts` pins
the fixture to the backend's response shape, so it cannot drift from what a live run returns.
