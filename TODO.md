# Fix EmploymentContracts.tsx to make it work

- [x] 1. Add standard container layout and page wrapper for proper display
- [x] 2. Update ContractForm props for onCancel, initialData, auto-fill from maids
- [x] 3. Implement edit functionality, pagination, search/filter
- [x] 4. Add localStorage persistence for contracts
- [x] 5. Fix/improve export with contract-specific PDF using maidExport
- [x] 6. Implement CSV import parsing
- [x] 7. Add action buttons (download per contract, copy ref)
- [x] 8. Test page render and features at /agencyadmin/employment-contracts

## Client Flow Cleanup

- [x] Separate client-side agency browsing from admin agency management pages
- [x] Add a dedicated Agencies Page with filters and agency cards
- [x] Add an Agency Details Page with grouped public maids
- [x] Keep maid browsing under agencies instead of scattering it through admin views
- [x] Rename user-facing direct-hire action to Accept in the client journey
- [x] Add Accept confirmation dialog before entering the hiring process
- [x] Rewire hiring flow to the existing direct-sale backend so submissions create a pending request
- [x] Verify frontend build, lint, and test runs after the updates
