---
description: How to integrate any frontend form with Google Sheets using Apps Script
---

# Google Sheets Form Integration Workflow

Use this workflow to connect a static website (like one hosted on GitHub Pages) or any React app to a Google Sheet without needing a back-end server.

## 1. Setup the Google Sheet & Apps Script
1. Create a new Google Sheet.
2. Go to **Extensions** → **Apps Script**.
3. Rename the project to something like `Form Handler`.
4. Paste the following code into `Code.gs`:

```javascript
// EB28 Lead Capture — Google Apps Script
// This script receives POST requests from a web form and appends data to a Google Sheet.

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Customize your columns here
    const row = [
      new Date(),       // Timestamp
      data.name,        // Name
      data.email,       // Email
      data.phone,       // Phone (optional)
      data.serviceNeed, // Infrastructure Need
      data.message,    // Message / Specs
      data.sourcePage   // Source Page (e.g., 'eb28.co')
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

5. Click **Deploy** → **New Deployment**.
6. Select Type: **Web App**.
7. Execute as: **Me**.
8. Who has access: **Anyone**.
9. Click **Deploy** and **Authorize Access**.
10. **CRITICAL:** Copy the **Web App URL**.

## 2. Frontend Implementation (React)
When calling the Apps Script from a static site (like GitHub Pages), you MUST use `mode: 'no-cors'`.

```javascript
const handleFormSubmit = async (e) => {
  e.preventDefault();
  
  try {
    await fetch('YOUR_GOOGLE_APPS_SCRIPT_URL', {
      method: 'POST',
      mode: 'no-cors', // Essential for direct GAS calls from static frontend
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        serviceNeed: formData.serviceNeed,
        message: formData.message,
        sourcePage: window.location.hostname
      }),
    });
    
    // In 'no-cors' mode, we won't see the JSON response, 
    // but if no error is thrown, the data was sent.
    setFormStatus('success');
  } catch (err) {
    setFormError('Submission failed. Please try again.');
  }
};
```

## 3. Best Practices
- **Column Management:** Make sure the order in the `row` array in the Apps Script matches your Google Sheet columns.
- **Validation:** Always perform client-side validation before calling the API.
- **Privacy:** If you move to a host like Vercel, you can hide the URL behind an environment variable and a serverless proxy; otherwise, the URL is public in the frontend JS (which is fine for simple contact forms).
