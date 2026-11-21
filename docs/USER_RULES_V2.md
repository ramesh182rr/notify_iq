# User rules schema v2

User rules are local, versioned instructions that organise NotifyIQ's stored notification history. They never suppress, dismiss, delay, or modify Android's original notification delivery. Rules apply only after the existing privacy gate has accepted an event for storage.

## Stored shape

The persisted document is a JSON object with this shape:

```json
{
  "schemaVersion": 2,
  "rules": [
    {
      "id": "rule-uuid",
      "name": "Bank alerts",
      "enabled": true,
      "conditions": {
        "match": "all",
        "appPackage": "com.example.bank",
        "category": "finance",
        "containsText": "payment"
      },
      "actions": [
        { "type": "setCategory", "value": "finance" },
        { "type": "save" },
        { "type": "includeInDigest", "value": true },
        { "type": "markImportant", "value": true },
        { "type": "addGroup", "value": "money" },
        { "type": "createReminder", "delayMinutes": 60 }
      ]
    }
  ]
}
```

`schemaVersion` is required and may be `1` or `2`; writes are canonicalized to v2. Each rule requires a unique stable `id`, a non-empty `name` of at most 80 characters, `enabled`, `conditions`, and at least one action. Unknown fields, conditions, actions, and enum values are rejected during import or save; they are never silently ignored.

Conditions are an AND of the supplied filters. At least one filter is required. `match` is currently only `all`. `appPackage` is an exact Android package name. `category` must be one of `other`, `finance`, `travel`, `delivery_shopping`, `reminder_calendar`, `social`, `promotion`, `system`, or `personal`; it matches the effective category, including a user's existing category correction. `priority` is `normal`, `high`, or `urgent`. `containsText` is a literal case-insensitive substring in the title, body, or subtext; it is not a regular expression. Text is capped at 120 characters and is normalized with Unicode NFKC before comparison.

The current rule editor exposes an optional exact app-package condition and an optional literal-text condition; when both are entered, both must match. The native schema also accepts category and priority conditions, but the editor does not expose those condition controls yet.

Supported actions are:

- `setCategory` with one supported category value.
- `save` with no value; saves the matching notification.
- `includeInDigest` with a boolean value.
- `markImportant` with a boolean value; this is an organisational flag and does not change Android priority.
- `addGroup` with a non-empty label of at most 40 characters.
- `createReminder` with `delayMinutes` from 5 through 10,080. The device schedules a local, generic NotifyIQ notification; it does not expose the source notification text on the lock screen. Android 13+ notification permission is requested when adding a rule that uses reminders.

Rule count is limited to 100 per profile, conditions to four filters per rule, and actions to six per rule. Group labels and rule names are plain text and must be rendered as text, never as markup.

## Evaluation semantics

1. Evaluate only enabled rules against the privacy-screened record. Evaluate categories against the record's effective category.
   Rules run when a new notification record is first created. A subsequent update to the same active Android notification retains the first evaluation. Stored history changes only when the user explicitly selects “Re-evaluate existing notifications.”
2. Rules run in their stored order. Each rule's conditions are ANDed; every matching rule runs. A non-match has no effects.
3. Actions within one rule run in listed order. Actions are idempotent assignments. `save` is a one-way set-to-true action; this schema does not define an automatic unsave action.
4. When multiple matching rules set a value for the same field, the later action in stored evaluation order wins. All distinct group labels are retained once, in first-seen order.
5. Evaluation produces a derived result with the matched rule IDs and schema version. It does not rewrite source notification text, original priority, or Android delivery state. User edits to saved/category/group fields remain explicit and take precedence until the user asks to re-evaluate rules.
6. Disabling or deleting a rule stops future evaluations. Explicit re-evaluation replaces prior rule-derived outcomes. Manually overridden saved state and category corrections take precedence. Reminder times already in the past are marked expired and are not delivered retroactively.
7. A parse or validation error rejects the whole document. The previous valid rule set remains active.

## Deliberate v1 limits

No regular expressions, free-form scripts, nested boolean expressions, time windows, notification dismissal, DND/quiet hours, automatic unsave, cloud execution, or notification-body persistence in rule diagnostics. Reminder timing uses Android's inexact idle-capable alarm API, so delivery may be delayed by Doze or system policy. Reboot rescheduling is supported while app data remains installed.
