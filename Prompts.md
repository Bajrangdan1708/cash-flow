# Cash-Flow: AI Prompt Log
**Sprint 02 Deliverable**

Below is the log of prompts used to architect, build, and refine the Cash-Flow application:

### 1. Initial Architecture & UI Setup
**Prompt:**
> Build a "Cash-Flow" Salary & Expense Tracker Module using HTML, CSS, and Vanilla JavaScript. I need a form to capture total salary and another for expenses. Display the remaining balance in real-time. Make sure to validate that inputs cannot be empty or negative. Structure the CSS and HTML professionally, but keep it realistic for a student submission.

### 2. State Management & Data Persistence
**Prompt:**
> Add LocalStorage support to the JavaScript file so that the salary and expenses array persist across page reloads. Also, add a delete function for each expense that removes the item from the DOM, updates the local storage, and recalculates the balance instantly.

### 3. Data Visualization
**Prompt:**
> Integrate Chart.js into the application. Add a Doughnut chart that displays the 'Remaining Balance' versus 'Total Expenses'. It should update automatically when a new expense is added or deleted. 

### 4. Stretch Goals (PDF Export, Currency & Alerts)
**Prompt:**
> Add three stretch features:
> 1. Use jsPDF to generate and download a PDF report containing the expense list and summary.
> 2. Use the Frankfurter API to let the user toggle currency between INR, USD, EUR, etc.
> 3. Add a critical UI warning if the Remaining Balance drops below 10% of the total salary (show a red banner and turn the balance text red).

### 5. UI Overhaul (Minimalism Request)
**Prompt:**
> Change the UI to a minimal setup so that no one can identify that it is made by AI. Keep the background light, remove all flashy/neon lighting, gradients, glassmorphism, and external fonts. Use basic standard fonts and standard solid colors instead.
