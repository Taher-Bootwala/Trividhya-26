Implementation Plan: Mobile Login, Admin Game Details & Dynamic Site Settings
- codex will review this plan and suggest changes if needed.
This plan outlines the required changes to fulfill the three feature requests: adding a mobile-specific login button, introducing a more detailed games view in the admin panel, and making homepage details dynamic and editable by the main admin.

User Review Required
IMPORTANT

Database Changes Required: You will need to run the following SQL snippet in your Supabase SQL Editor to support the dynamic homepage details before we can fully test the third feature.

sql
ALTER TABLE admin_config 
ADD COLUMN hero_title TEXT DEFAULT 'TECH-FIESTA''26',
ADD COLUMN navbar_title TEXT DEFAULT 'TRIVIDHYA''26',
ADD COLUMN event_dates TEXT DEFAULT 'March 23 & 25, 2026',
ADD COLUMN event_venue TEXT DEFAULT 'GEC Dahod';
Proposed Changes
1. Mobile Login Button
We will add a "Login" button specifically visible on mobile devices inside the navbar (below the Contact link).

[MODIFY] index.html
Add a new <li> to the navLinks list with a Login button, wrapped in a mobile-only utility class.
Create a simple sub-menu or modal for the two requested options:
Login as event manager (triggers the existing eventAdminModal).
Login as event organizer (triggers the existing mainAdminModal).
[MODIFY] style.css
Add CSS rules to hide this login button on desktop screens (@media (min-width: 768px) { .mobile-only { display: none; } }) and style the button for mobile view.
2. Admin Panel: Game Event Details Tab
We will create a new tab in the Super Admin dashboard dedicated to displaying detailed registration info for games.

[MODIFY] admin.html
Add a new tab button "Game Details".
Add the corresponding tab content section <div id="tab-game-details" class="tab-content">.
Inside the tab, create a container to render games and their subsequent teams/members.
[MODIFY] admin.js
Create a function 
renderGameDetailsTab()
 that filters allEvents for category === 'game' and checks if they have any registrations in allRegs.
For each matching game, render an accordion or card list showing:
Total participants
Team Name, Leader Name, Payment Status (Pending/Paid), and Total Fee
An expandable list of all member names (if any).
Hook this function to run when the tab is switched or the dashboard loads.
3. Dynamic Homepage Details
Allow the Main Admin to edit the navbar title, hero title, dates, and venue, which will then proactively reflect on the main website.

[MODIFY] admin.html
Add a "Site Settings" tab in the admin panel.
Inside this tab, add an HTML form with input fields for Navbar Title, Hero Title, Dates, and Venue.
Add a "Save Settings" button.
[MODIFY] admin.js
In the 
loadDashboard
 function, fetch the admin_config row (ID = 1).
Populate the Site Settings form with the retrieved values.
Create an 
updateSiteSettings()
 function to submit changes to Supabase's admin_config table.
[MODIFY] script.js
Create a function 
loadSiteSettings()
 that runs on page load.
It will query the admin_config table from Supabase.
Using DOM manipulation, it will dynamically update:
document.getElementById('mainLogo').textContent (Navbar Title)
The hero title <h1> inside .hero-content
The date constraint inside .hero-date
The venue constraint inside .hero-date
Verification Plan
Automated Tests
None. Handled via visual UI changes.

Manual Verification
Mobile Login: Open 
index.html
 in a browser, use Developer Tools to simulate a mobile view, and verify that the "Login" option appears in the hamburger menu. Check that both login sub-options successfully open the respective modals.
Game Details: Login as Main Admin (admin123), navigate to the "Game Details" tab, and ensure that only games with at least 1 registration are shown, accompanied by correct team and fee info.
Dynamic Config: Login as Main Admin, go to "Site Settings", change the venue name, click save. Refresh the main 
index.html
 page and visually confirm that the new venue is securely loaded directly from Supabase upon startup.
4. Dynamic Online Payment QR Code
During registration, if a user selects "Online" payment, a QR code should be displayed dynamically, along with instructions to verify the payment with the admin and a field to enter the transaction ID. The Main Admin can update this QR Code in the Site Settings.

[MODIFY] schema.sql (User Review Required)
Add qr_url column to admin_config table.
Add transaction_id column to registrations table.
[MODIFY] admin.html & admin.js
In Site Settings tab, add a file upload input for "Payment QR Code".
admin.js
 will upload the image to Supabase Storage (trividhya_images/qr_codes/) and save the public URL to admin_config.qr_url.
[MODIFY] index.html
Update the Registration Modal:
When "Online" payment is selected, display the QR code (qr_url fetched from admin_config).
Add text: "Please pay ₹[amount] and verify payment with the admin to confirm registration."
Add a text input for the Transaction ID.
Change the submit button text based on the flow. After successful submission, show a "Thank you for registration, for any query contact the admin." popup/modal.
[MODIFY] script.js & supabase-config.js
Update submitRegistration function to include the transaction_id.
Ensure the registration modal logic handles the QR display toggle based on the "Online/Cash" payment mode selection.