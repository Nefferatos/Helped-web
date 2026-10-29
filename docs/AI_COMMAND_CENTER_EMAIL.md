# AI Command Center email

Agency staff can ask the Command Center to prepare an email for an enquiry or applicant included in the agency's context. The assistant returns a draft action using the record ID; it does not choose or invent an email address.

The dashboard opens a review dialog showing the record name, resolved email address, subject, and editable plain-text message. The staff member must click **Send email**. The authenticated Worker then reloads the record, checks that it still belongs to that agency, verifies that the email address has not changed since the draft was prepared, and sends through the existing Resend mail helper. It does not send to arbitrary addresses or to a different agency's records.

Required mail configuration is the existing server-side `RESEND_API_KEY` secret and `RESEND_FROM` verified sender. If Resend is not configured or rejects the message, the UI reports failure and leaves the draft available to retry. The request does not include attachments or HTML.

Examples:

- `Draft and send a reply to enquiry 124 confirming we'll follow up tomorrow.`
- `Prepare an email to applicant ATS-... inviting them to confirm their availability.`

When a request could match more than one record, the assistant should ask which record. The email action only supports an enquiry or applicant record that the current agency user is authorized to access. Review the address and full message before sending.
