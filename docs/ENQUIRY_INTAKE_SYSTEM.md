# Helped Maids Enquiry Intake System

## Overview

The Enquiry Intake System extracts and structures raw employer enquiries into a standardized JSON format. This system acts as an intelligent parsing layer that converts unstructured text (emails, form submissions, chat messages) into actionable, structured data.

## Architecture

### Components

1. **Enquiry Extractor** (`backend/src/lib/enquiryExtractor.ts`)
   - Core NLP-based extraction engine
   - Pattern matching for key information
   - Urgency determination
   - Tag generation

2. **API Endpoint** (`POST /api/enquiries/extract`)
   - Accepts raw enquiry text
   - Returns structured JSON
   - Optionally saves to database
   - Integrates with support inbox

3. **Frontend Form** (`frontend/src/components/EnquiryIntakeForm.tsx`)
   - User-friendly intake interface
   - Real-time extraction display
   - JSON export and download
   - Copy-to-clipboard functionality

4. **Database Integration**
   - Stores enquiries in `enquiries` table
   - Links to support conversations
   - Creates chat messages automatically

## Data Structure

### Input

```json
{
  "rawText": "Raw employer enquiry text",
  "email": "employer@example.com",
  "phone": "+65 XXXX XXXX",
  "username": "Employer Name"
}
```

### Output (Extracted JSON)

```json
{
  "employer_summary": "1-2 sentence summary of the request",
  "requirements": {
    "nationality_preference": "philippine|indonesian|no preference|null",
    "live_in_out": "Live-in|Live-out|Flexible|null",
    "budget_band": "range or single amount|null",
    "start_date": "date reference|null",
    "household_size": "number of members|null",
    "other_notes": "additional requirements|null"
  },
  "urgency": "High|Medium|Low",
  "suggested_tags": ["tag1", "tag2", "tag3"] // max 5 tags
}
```

## Usage

### API Integration

#### Extract Only (No Save)

```bash
POST /api/enquiries/extract
Content-Type: application/json

{
  "rawText": "Looking for a live-in maid ASAP. Family of 4..."
}
```

#### Extract and Save

```bash
POST /api/enquiries/extract
Content-Type: application/json

{
  "rawText": "Looking for a live-in maid ASAP...",
  "email": "john@example.com",
  "phone": "+65 9123 4567",
  "username": "John Tan"
}
```

### Frontend Usage

1. Navigate to `/enquiry-intake` page
2. Paste raw enquiry text
3. Optionally add contact information
4. Click "Extract & Structure"
5. Review extracted data
6. Copy JSON or download as file

### Programmatic Usage

```typescript
import { extractEnquiry, formatEnquiryJson } from "@/lib/enquiryExtractor";

const rawText = "Your raw enquiry text here...";
const extracted = extractEnquiry(rawText);
const jsonString = formatEnquiryJson(extracted);
console.log(jsonString);
```

## Extraction Rules

### Nationality Preference

Detects keywords: `philippine`, `indonesian`, `thai`, `myanmar`, `indian`, `bangladeshi`, `nepali`, `sri lankan`, `cambodian`, `vietnamese`

### Live-in/Live-out

- **Live-in**: matches `live-in`, `residential`, `live in`
- **Live-out**: matches `live-out`, `daily`, `part-time`, `non-residential`
- **Flexible**: matches `flexible`, `either`, `both`

### Budget Band

Extracts currency amounts in SGD, USD, GBP, INR, or plain numbers

- Pattern: `SGD 500-600`, `$500 to $600`, `500-600`

### Urgency Classification

- **High**: `asap`, `urgent`, `immediately`, `emergency`, `right away`, `today`, `this week`, `rush`
- **Low**: `no rush`, `flexible`, `whenever`, `anytime`, `not urgent`
- **Medium**: Default if no indicators present

### Household Size

Extracts from: `family of X`, `X members`, `X people`, `household of X`

### Start Date

Looks for: `start date`, `asap`, `immediately`, `next week`, `1st September`, date patterns

### Tags Generated

- Urgency: `Urgent`, `Non-urgent`
- Arrangement: `Live-in`, `Live-out`, `Flexible`
- Nationality: `philippine`, `indonesian`, etc.
- Care Type: `Elderly-care`, `Childcare`, `Housekeeping`, `Cooking`
- Budget Level: `Budget` (<500), `Premium` (>2000)

## Sample Enquiries

### Example 1: Simple Family Enquiry

**Raw Input:**

```
Hello, we are a family of 4 looking for a live-in domestic helper.
We need someone who can do general housekeeping and cooking.
Budget is around SGD 800-900 per month. Start date should be next month.
Preferably Philippine nationality.
```

**Extracted JSON:**

```json
{
  "employer_summary": "Family of 4 seeking live-in domestic helper for housekeeping and cooking at SGD 800-900/month.",
  "requirements": {
    "nationality_preference": "philippine",
    "live_in_out": "Live-in",
    "budget_band": "800-900",
    "start_date": "next month",
    "household_size": "4 members",
    "other_notes": "general housekeeping; cooking"
  },
  "urgency": "Medium",
  "suggested_tags": ["Live-in", "philippine", "Housekeeping", "Cooking"]
}
```

### Example 2: Urgent Elderly Care

**Raw Input:**

```
URGENT - Need caregivers ASAP. My mother is 82 years old and requires
24-hour care. We need a live-in maid who has experience with elderly care.
Budget is flexible, no more than SGD 2000/month. Can start immediately.
Must be reliable and compassionate. Any nationality is fine.
```

**Extracted JSON:**

```json
{
  "employer_summary": "Urgent need for 24-hour elderly care for 82-year-old. Live-in arrangement with flexible budget up to SGD 2000/month.",
  "requirements": {
    "nationality_preference": null,
    "live_in_out": "Live-in",
    "budget_band": "2000",
    "start_date": "immediately",
    "household_size": null,
    "other_notes": "experience with elderly care; reliable and compassionate"
  },
  "urgency": "High",
  "suggested_tags": ["Urgent", "Live-in", "Elderly-care", "Premium"]
}
```

## Integration with Support System

When an enquiry is extracted and saved:

1. **Creates enquiry record** in `enquiries` table
2. **Creates support conversation** if client email matches existing client
3. **Creates chat message** linking to the structured enquiry
4. **Generates notifications** for assigned support staff
5. **Tags automatically** based on extracted requirements

## Testing

### Run Test Suite

```bash
cd backend
npm run test:enquiry

# or programmatically
import { testEnquiryExtraction } from '@/lib/enquiryTestData'
await testEnquiryExtraction()
```

### Test Cases Included

1. Simple Family Enquiry
2. Urgent Elderly Care
3. Childcare Only (Part-time)
4. Multi-requirement High Budget
5. Flexible Arrangement

## Database Schema

### Enquiries Table

```sql
CREATE TABLE enquiries (
  id INTEGER PRIMARY KEY,
  agencyId INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  date VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  clientId INTEGER,
  clientName VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'new',
  note TEXT,
  assignedTo VARCHAR(255)
);
```

### Related Tables

- `support_conversations`: One-to-many with enquiries
- `support_messages`: Chat history
- `chat_messages`: Support inbox integration

## API Endpoints

### Create Enquiry (Traditional)

```
POST /api/enquiries
{
  "username": "string",
  "email": "string",
  "phone": "string",
  "message": "string"
}
```

### Extract Enquiry (New)

```
POST /api/enquiries/extract
{
  "rawText": "string",
  "email": "string (optional)",
  "phone": "string (optional)",
  "username": "string (optional)"
}
```

### Get All Enquiries

```
GET /api/enquiries?search=term
```

### Update Enquiry

```
PATCH /api/enquiries/:id
{
  "status": "new|in_progress|replied|resolved",
  "note": "string",
  "assignedTo": "string"
}
```

### Delete Enquiry

```
DELETE /api/enquiries/:id
```

## Configuration

### Environment Variables

```env
ENQUIRY_MAX_TEXT_LENGTH=10000
ENQUIRY_EXTRACTION_TIMEOUT=5000
ENQUIRY_AUTO_TAG_ENABLED=true
ENQUIRY_AUTO_SAVE=true
```

## Error Handling

### Common Errors

- `400 Bad Request`: Missing required fields
- `404 Not Found`: Enquiry not found
- `500 Internal Server Error`: Extraction or database error

### Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Performance Considerations

- Extraction: ~50-100ms per enquiry
- Database save: ~100-200ms (if enabled)
- Batch processing: Can handle 100+ enquiries/minute
- Maximum text length: 10,000 characters

## Future Enhancements

1. **Machine Learning**: Train NLP model on historical data
2. **Multi-language**: Support Chinese, Tamil, Malay inputs
3. **Confidence Scoring**: Add confidence levels to extracted fields
4. **Custom Rules**: Allow agencies to define extraction rules
5. **Webhook Integration**: Send extracted data to external systems
6. **Batch Processing**: API for processing multiple enquiries
7. **History Tracking**: Version control for extraction updates

## Support

For issues or feature requests, contact the development team or create an issue in the project repository.
