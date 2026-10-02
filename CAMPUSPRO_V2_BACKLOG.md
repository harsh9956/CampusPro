# CampusPro V2 — Enhancement & Roadmap Backlog
> **Note:** CampusPro V1 is **Feature Frozen**. The items below are cataloged for post-V1 architecture, scalability, and platform expansion.

---

### 1. Real-Time Streaming & Push Notifications
- **WebSockets / Server-Sent Events (SSE):** Replace client-side notification polling with persistent real-time streaming for live drive updates, application shortlist notifications, and round result alerts.
- **Push Notification Integration:** Web Push / Service Worker integration to deliver browser notifications even when the user has minimized the application.

### 2. Advanced Multi-Factor Authentication (MFA / 2FA)
- **TOTP Authenticator:** Time-based one-time password support (Google Authenticator, Microsoft Authenticator) mandatory for Super Admin and TPO Admin accounts.
- **SMS OTP Fallback:** Twilio or AWS SNS SMS OTP delivery for student phone verification.

### 3. Extended Multi-Tenant & Multi-Campus Architecture
- **Multi-Institutional Partitioning:** Tenant-level database segregation for university systems managing multiple affiliated engineering and management campuses under one portal.
- **Centralized Master Company Directory:** Cross-campus shared corporate recruiter profiles with campus-specific drive schedules.

### 4. Native Mobile Applications
- **React Native Companion Apps:** Dedicated Android and iOS applications for students to receive instantaneous interview call letters, mock assessment reminders, and drive eligibility updates.

### 5. Advanced AI Resume Intelligence (V2 Engine)
- **External LLM Resume Review:** Optional integration with Gemini Pro / OpenAI APIs for contextual semantic bullet-point suggestions, grammar scoring, and deep JD gap analysis beyond local keyword/regex matching.

### 6. Interactive Cookie Consent Management
- **Conditional Consent Banner:** If institutional stakeholders choose to enable non-essential marketing pixels, ad trackers, or third-party heatmaps in future versions, deploy a customizable GDPR/DPDP-compliant cookie consent manager.
