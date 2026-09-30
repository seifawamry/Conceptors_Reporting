# ☁️ Conceptors CRM: Google Drive & Google Sheets Sync Guide

This guide enables **real-time synchronization between your Laptop and Mobile Phone** and automatically saves all visits, orders, and reports as **CSV spreadsheets directly to your Google Drive**.

---

## Why Is This Needed?
- Modern web browsers store local data in **isolated memory** on that specific device.
- By connecting the CRM to a **Google Apps Script Web App**:
  1. Every visit (planned or unplanned) and sales order logged from your **mobile phone** immediately saves to Google Drive.
  2. When you open the CRM on your **laptop**, it instantly retrieves those records from Google Drive.
  3. Master CSV files (`Visits_Master.csv`, `Orders_Master.csv`, `Daily_Reports.csv`) are automatically generated and kept up-to-date in your Google Drive folder!
  4. **100% Free, zero database maintenance, zero SQL required.**

---

## 3-Minute Step-by-Step Setup

### Step 1: Open Google Sheets
1. In your web browser, navigate to [sheets.new](https://sheets.new) (or create a new Google Sheet inside your Google Drive).
2. Name the sheet: **`Conceptors CRM Master Database`**.

### Step 2: Open Apps Script Editor
1. In the Google Sheet top menu bar, click:
   **`Extensions` ➔ `Apps Script`**
2. In the code editor that opens, delete all existing placeholder code (e.g. `function myFunction() { ... }`).

### Step 3: Paste the Sync Script Code
1. Open the file **`google_drive_sync.gs`** in this project (or click **Copy Script Code** inside the CRM's Cloud Sync window).
2. Paste the entire code into the Google Apps Script editor.
3. Click the **💾 Save** icon (or press `Ctrl + S`).

### Step 4: Deploy as a Web App
1. At the top right of the Apps Script window, click the blue **`Deploy`** button ➔ select **`New deployment`**.
2. Click the gear icon ⚙️ next to "Select type" and choose **`Web app`**.
3. Fill in the deployment settings:
   - **Description**: `Conceptors CRM Sync Engine`
   - **Execute as**: `Me (<your-email>@gmail.com)`
   - **Who has access**: **`Anyone`** *(This is essential so your CRM on both your phone and laptop can read/write data).*
4. Click **`Deploy`**.
5. Google will ask you to **Authorize access**:
   - Click **Review permissions** ➔ Select your Google Account.
   - Click **Advanced** (at the bottom left) ➔ Click **"Go to Conceptors CRM Sync (unsafe)"**.
   - Click **Allow**.
6. Google will now show you the **Web app URL** (it looks like: `https://script.google.com/macros/s/AKfycb.../exec`).
7. **Copy this URL!**

### Step 5: Connect in the CRM
1. Open your Conceptors CRM on your Laptop or Phone.
2. In the top navigation bar, click the **`☁️ Cloud Sync`** badge.
3. Paste your Web App URL into the **Google Apps Script Web App URL** field.
4. Click **`Save & Connect`**.

---

## That's It! What Happens Automatically?

1. **Both Devices Synced in Real Time**:
   - Log an unplanned visit or order on your **mobile phone**.
   - Open the CRM on your **laptop** — the record is right there in the Daily Visit Report and Orders list!
2. **Auto-Updating CSV Files in Your Google Drive**:
   - The script creates a folder in your Google Drive named **`Conceptors CRM Data`**.
   - It continuously updates:
     - `Conceptors_Visits_Master.csv`
     - `Conceptors_Orders_Master.csv`
     - `Conceptors_Monthly_Plans.csv`
3. **Live Google Sheet Tabs**:
   - Inside your Google Sheet, you will see dedicated tabs:
     - `Visits` (all field call detailing records, doctors met, sentiments, outcomes)
     - `Orders` (all commercial orders, VAT, AED totals, items)
     - `MonthlyPlans` (monthly visit targets and approvals)
     - `StockRequests` (field sample and demonstration requests)
     - `AuditLogs` (timestamped history of all entries)

---

## 📥 Offline / Manual CSV Export
You can also download complete CSV spreadsheets directly to your laptop or phone at any time:
- In the top bar of the CRM, click **`Export CSVs`**.
- Or open the Cloud Sync modal and click **`Download All CSVs`**.
