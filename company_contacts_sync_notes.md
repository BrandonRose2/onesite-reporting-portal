# Company Contacts Synchronization Notes

## Authorized source

Property contact details were obtained from the user-authorized Notion page **Company Contacts 7.23.2026** through the user’s live Microsoft Edge session after the direct workspace connector was unavailable.

## Imported coverage

The Mac-side deterministic parser and secured portal runner endpoint submitted all **35** active portal properties to `propertyContacts`.

| Mapping status | Count | Handling |
|---|---:|---|
| Verified | 27 | Contact details may be shown and used for contact-email autofill. |
| Review required | 4 | Details are visible with a review marker; users should validate them before relying on them operationally. |
| Unmapped | 4 | No confident source match was imported. |

The portal preserves the source property label, manager name, email, mobile, office number, mapping status, source page title, and synchronization timestamp. Extensions remain a follow-up because the browser-text export did not reliably preserve that column.

## Safety behavior

The secured sync API accepts only the authorized source page title and requires the private Mac runner token. The OneSite Reporting Hub selects a verified contact by default and autofills its email into External completion emails. Manager Checklists display the selected property’s contact card and only autofill an empty manager-name field, preserving existing user-entered outreach notes.

## Current reconciliation decisions

The active property with external ID `4022593` is displayed as **Riverchase** throughout the portal; its prior historical label is retained only in archived source metadata where applicable. **Granite Elmwood Indiana Homes** and **Granite Valencia Villas** remain in reporting history but are intentionally excluded from Company Contacts autofill and manager outreach until the user confirms their identity and ownership.
