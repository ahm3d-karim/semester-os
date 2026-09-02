# Brief Templates

Three briefing types. Every briefing is stored in `briefings` table and delivered via WhatsApp (template message) or in-app `/today`.

---

## 1. Weekly Brief (every Monday, 8am)

Triggered by: Vercel cron or worker, weekly.
Source: approved model_items where date falls in the upcoming 7 days.

```
WEEKLY BRIEF — {term} Week {session_no}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{course_code} {course_title}
  {date}  {session_no}  {item_title} ({kind})
  {detail — truncated to 1 line}
  Weight: {weight}% | Status: {not yet graded}

{course_code} {course_title}
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRADE BUDGET
  {course_code}: {scored}/{total_weight} ({running_pct}%) — {status}
  {course_code}: not yet graded

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POLICIES TO REMEMBER
  - {policy_title}: {detail — first sentence}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next session: {next_session_no} — {next_date}
```

Rules:
- Only approved items shown.
- Items sorted by date ascending within each course.
- Grade budget only includes courses with at least one scored component.
- If no items due this week, brief says "No deadlines this week. Review pending: {list of ungraded past items}."
- WhatsApp: sent as template message (pre-approved template, 24h window respected).
- In-app: rendered at `/today`, stored with `kind = 'weekly'`.

---

## 2. T-5 Warning (5 days before deadline)

Triggered by: Vercel cron or worker, daily at 8am.
Source: approved model_items where `date - today <= 5` and `date >= today` and `kind = 'deadline'`.

```
⚠️  {days} DAYS LEFT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{course_code} — {item_title}
Due: {date} (Session {session_no})
{detail — first 2 lines}
Weight: {weight}%
```

Rules:
- Only fires once per item (tracked by `delivered_at` in briefings table — skip if already delivered for this item + this warning type).
- Fires at T-5, T-3, T-1 (three warnings per deadline).
- If date passes without a grade entry, add a nudge: "This deadline has passed. Have you submitted? Log your grade when available."
- WhatsApp: template message. In-app: notification badge on `/today`.

---

## 3. Budget Delta (grade logged)

Triggered by: user saves a grade_entry.
Source: grade_entries + model_items (grade_component kind).

```
📊 GRADE UPDATE — {course_code}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{component_title}: {score}/{max} (entered now)

Running total: {scored_sum}/{total_weight} = {running_pct}%
Remaining: {ungraded_weight}% across {ungraded_count} components

{if running_pct < 60: "⚠️ Below passing range. Consider scheduling review."}
{if running_pct >= 90: "🟢 Strong position. Keep it up."}
```

Rules:
- Fires immediately on grade save (in-app only; WhatsApp optional via settings).
- If budget status is `over` (total weight > 100), show warning: "Grade weights sum to {total}%. Check syllabus — components may be miscounted."
- If budget status is `under`, show: "Grade weights sum to {total}%. {100-total}% of your grade is unaccounted for."

---

## Delivery Order

1. Budget delta → in-app immediately, WhatsApp optional.
2. T-5 warning → in-app + WhatsApp daily.
3. Weekly brief → in-app Monday 8am, WhatsApp Monday 8am (template message).

All deliveries stored in `briefings` with `delivered_via` (in-app | whatsapp | email) and `delivered_at`. Duplicate delivery prevention: check `briefings` for matching `(user_id, kind, item_id|week_no)` before sending.
