# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite (two separate portals: `Frontend/GiangVien` on port 5173, `Frontend/SinhVien` on port 5174). Shared design system in `Frontend/shared/`. Backend: Node.js / Express (port 3000) with MySQL data warehouse. Power BI embedded for heavy analytics views. Tailwind CSS v4 + Ant Design on the student portal; Lucide React icons on the lecturer portal.

## Users

**Primary — Lecturers (Giảng viên):** University teaching staff at Đại học Đà Lạt. They open the platform to monitor class-level performance, identify at-risk students early, manage assignments, and decide whether to intervene with struggling learners. They work on desktop, typically during office hours or between sessions.

**Secondary — Students (Sinh viên):** DLU students checking their own grades, learning progress, engagement patterns, and early-warning signals. They open the platform on both desktop and mobile, often around exam periods.

## Product Purpose

A Learning Analytics platform built on top of Đại học Đà Lạt's Moodle LMS. It ingests Moodle activity data through an ETL pipeline into a MySQL data warehouse and surfaces it as actionable dashboards for two distinct audiences. The student portal gives learners self-service visibility into their own academic health; the lecturer portal gives teaching staff the signals they need to identify and act on at-risk cases before a student fails.

## Positioning

Integrates directly with DLU's existing Moodle instance rather than requiring a separate data entry workflow — lecturers and students see analytics derived from the activity already happening inside their courses, not from manual uploads. The early-warning scoring (correlation analysis, segment-based risk flags) is embedded natively rather than delegated to an external BI tool.

## Operating Context

- University academic calendar: interventions are time-critical (a warning raised after the exam is useless).
- Moodle LMS 3.9 is the source-of-truth; no direct database writes back to Moodle.
- Power BI embedded reports appear inside the lecturer portal for aggregate analytics.
- Auth is JWT-based; two separate auth scopes for lecturer and student roles.
- Both portals share a DLU-branded design system (`Frontend/shared/dlu-theme.css`) with the university's forest-green (`#0a543f`) and amber/gold palette.
- Capstone / thesis submission context: the system must also read as a credible, complete engineering artifact.

## Capabilities and Constraints

- **Lecturer portal:** class overview, student detail, assignment management, early-warning list, correlation analysis (Power BI embedded), grade simulator.
- **Student portal:** personal grade summary, progress timeline, behaviour metrics, segment classification, early-warning self-view.
- **ETL pipeline:** 9 SQL scripts populate `lms_datawarehouse` from Moodle source tables; no real-time sync.
- **No Moodle write-back:** the system is read-only with respect to Moodle.
- **No fabricated evidence:** testimonials, benchmark numbers, or deployment claims must not be invented. The system's credibility comes from the real data model and real DLU course data.
- Stack is fixed (not greenfield); visual-world and UX decisions work within React + Vite.

## Brand Commitments

- **Institution:** Đại học Đà Lạt (DLU). Motto: "Thụ Nhân, Khai Phóng, Bản Sắc."
- **Primary palette:** DLU forest green `#0a543f` (dark) to `#2e8856` (mid), amber/gold `#c9a45a` / `#e87524`.
- **Neutral background:** `#f5f7f5` (light greenish-grey).
- **Shared header component:** `Frontend/shared/components/DluHeader.jsx`.
- **Voice:** institutional, clear, supportive — not corporate-minimal, not playful. Vietnamese is the display language for labels, but code and documentation stay in English/Vietnamese mixed.
- **Student-facing warnings:** khuyến khích, đưa ra hành động tiếp theo cụ thể;
  không dùng ngôn ngữ quy chụp hay làm xấu hổ (tránh "bạn sẽ rớt").
- **Lecturer-facing:** thẳng, dựa trên dữ liệu, có mức độ ưu tiên.
- **Semantic risk colors (separate from brand):** mức rủi ro dùng bộ màu riêng
  (cao / trung bình / thấp / ổn định), không tái sử dụng amber thương hiệu.
  `#c9a45a` = accent thương hiệu; `#e87524` = chỉ dùng cho [điền vai trò, ví dụ: hành động chính].

## Evidence on Hand

- Full SQL schema and seed data for `lms_datawarehouse` (dimensions, facts, analytics tables).
- ETL pipeline scripts (9 files) that process real Moodle 3.9 export structures.
- Built dist artifacts in both `Frontend/GiangVien/dist` and `Frontend/SinhVien/dist`.
- Shared design-system CSS with documented token set (`dlu-theme.css`, 621 lines).
- No publicly available screenshots or live-demo URL on record.

## Product Principles

1. **Timely signal over comprehensive report.** A lecturer who sees a student's risk flag on day 30 can act; a 200-row export after the exam cannot. Prioritise immediate, scannable warnings.
2. **Trust through accuracy.** Every number traces to a real ETL source. Never estimate, interpolate, or embellish data.
3. **Institutional identity without institutional blandness.** DLU's green-and-gold palette is a constraint and a strength — use it with precision, not as wallpaper.
4. **Two distinct audiences, one coherent system.** Lecturer and student portals share tokens and the header component, but serve genuinely different jobs; resist collapsing them into a single generic "dashboard."
5. **Operable at thesis defence resolution.** Every screen must hold up at full-screen projection and in a printed doc screenshot — contrast, label legibility, and information density matter at that scale.

## Accessibility & Inclusion

WCAG AA contrast is required for all text on DLU green backgrounds (the dark palette makes this achievable but must be verified). Vietnamese diacritics must render correctly at all weights. No specific assistive-technology requirement recorded beyond standard semantic HTML.
- Mức rủi ro luôn đi kèm nhãn chữ và/hoặc icon, không chỉ dùng màu
  (người mù màu, và bản in đen trắng trong báo cáo đồ án).

- Known inconsistency: hai portal dùng bộ component/icon khác nhau;
  token dùng chung nằm ở `dlu-theme.css`.

  ## Anti-references
- Dashboard SaaS gradient tím/xanh neon, card bo tròn quá mức, số liệu to nhưng rỗng nghĩa.
- Biểu đồ trang trí không phục vụ quyết định can thiệp.