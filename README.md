# Conceptors Animal Health - Medical Representative CRM & Field Reporting System

An enterprise-grade, responsive Web CRM and Field Reporting System engineered specifically for medical representatives and commercial sales leadership at **Conceptors Animal Health LLC**.

Built with pure vanilla web architecture (HTML5, Tailwind CSS, JavaScript ES6+, Lucide Icons), requiring zero server dependencies or build steps. Ready for instant deployment on **Vercel**, **GitHub Pages**, or any static hosting platform.

---

## 🌟 Key Features

- **Strict 5-Day Advance Planning Policy**: Eliminates historical planning; forces monthly route targets to be submitted at least 5 days in advance (`plannedDate >= today + 5 days`).
- **Spontaneous Unplanned Visits Engine**: Field reps can log real-time ad-hoc stops executed on the day of submission (`visitCategory: 'Unplanned'`) alongside pre-planned itineraries.
- **Full 260 Real Veterinary Accounts**: Integrated directly from official client master records with unique account codes (`DC0900`, `SC0977`, `AP0978`, `JC0979`, etc.), clinic names, emirates, and VIP tiers.
- **Search-as-you-Type Comboboxes**: Real-time typeahead filtering across clinic names, client codes, and cities across all interaction modals (`Plan Visit`, `Log Unplanned Visit`, `Order Dispatch`).
- **Role-Based Access Control & Territory Isolation**:
  - **Dr. Shaimaa (Territory 1)**: 123 veterinary accounts (Dubai, Abu Dhabi, Al Ain).
  - **Dr. Marsel (Territory 2)**: 137 veterinary accounts (Sharjah, Ajman, RAK, UAQ, Fujairah).
  - **Dr. Sameh Ageez (Senior Manager)**: Full national visibility across all 260 accounts, team metrics, and order approvals.
- **Field Sales Order Dispatch & Alerts**: Automatic calculation of order totals, inventory validation, and automated notification/email dispatch to senior management upon submission.
- **Executive Operations & Analytics**:
  - Call Frequency by clinic & tier (Target vs. Actual).
  - Territory Customer Coverage ratios.
  - Planned vs. Unplanned execution ratios.
  - Conversion rates and average revenue per representative.
- **Dual Visual Modes**:
  - **Dark Screen**: High-contrast, futuristic executive dark theme.
  - **Bright Screen**: Luminous, soft daylight slate canvas (`#eaf0f8`) designed for field visibility with deep charcoal text (`#0f172a`) and jewel-tone accents.

---

## 🔐 Demo Credentials

| Role | Name | Username | Password | Assigned Territory |
| :--- | :--- | :--- | :--- | :--- |
| **Senior Manager** | Dr. Sameh Ageez | `sameh.ageez` | `admin` | National HQ (All 260 Accounts) |
| **Medical Rep (T1)** | Dr. Shaimaa | `shaimaa.t1` | `rep1` | Territory 1 (123 Accounts) |
| **Medical Rep (T2)** | Dr. Marsel | `marsel.t2` | `rep2` | Territory 2 (137 Accounts) |

*Quick login buttons are also available on the login modal for instant one-click switching.*

---

## 🚀 Deployment to Vercel

### Method 1: Deploy from GitHub (Recommended)
1. Push this repository to your **GitHub** account (see instructions below).
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Click **"Add New..."** -> **"Project"**.
4. Select your imported GitHub repository (`conceptors-rep-crm`).
5. In Framework Preset, keep **"Other"** (static site).
6. Click **Deploy**. Vercel will build and provide a live URL within seconds!

### Method 2: Deploy directly via Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Run vercel deploy inside the project directory
vercel
```

---

## 💻 Local Development

Simply open `index.html` in any modern web browser:
```bash
# On Windows
start index.html

# Or using a lightweight local server
npx serve .
```

---

## 📁 Repository Structure

```
conceptors-rep-crm/
├── index.html        # Main single-page application & modal templates
├── styles.css        # Clinical theme, responsive layout & custom scrollbars
├── crm_app.js        # Core CRM business logic, state engine & UI controllers
├── crm_data.js       # Complete 260 customer database & product catalogs
├── vercel.json       # Vercel deployment & security headers configuration
├── package.json      # Project metadata & npm scripts
├── .gitignore        # Git ignore rules
└── README.md         # Documentation & setup guide
```

---

## 📄 License
Internal commercial system developed for **Conceptors Animal Health LLC**. All rights reserved.
