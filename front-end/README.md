# Front-End Application

A modern React/Next.js application providing an intuitive user interface for document upload, invoice data extraction, and sales order management. This frontend connects to a Flask backend API for document processing and data persistence.

## Overview

This frontend application is part of a technical case study demonstrating AI-powered document extraction. It provides a clean, user-friendly interface for:

- Uploading invoice documents (PDF, PNG, JPG)
- Reviewing extracted invoice data before saving
- Viewing and managing sales orders
- Editing sales order details inline
- Real-time processing status updates

## Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Custom components built with shadcn/ui patterns and Radix UI primitives
- **Icons:** Lucide React
- **State Management:** React hooks and local state

## Project Structure

```
front-end/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Landing/homepage
│   ├── dashboard/           # Dashboard route
│   │   └── page.tsx         # Sales orders dashboard
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── sales-order-table.tsx        # Main sales orders table
│   ├── sales-order-form-sheet.tsx   # Review/edit form sheet
│   └── ui/                  # Reusable UI components
│       ├── button.tsx
│       ├── sheet.tsx
│       ├── table.tsx
│       └── collapsible.tsx
├── lib/                     # Utility functions
│   ├── api.ts              # API client and endpoints
│   ├── types.ts            # TypeScript type definitions
│   └── utils.ts            # Utility functions
├── public/                 # Static assets
└── package.json            # Dependencies and scripts
```

## Key Features

### Document Upload
- Drag-and-drop file upload interface
- Support for PDF, PNG, and JPG formats
- Real-time upload progress indicators
- File validation and error handling

### Data Review & Editing
- Interactive form sheet for reviewing extracted data
- Inline editing of sales order header information
- Line item management with product selection
- Customer information display and editing

### Sales Orders Dashboard
- Comprehensive table view of all sales orders
- Search and filter capabilities
- Expandable rows for viewing order details
- Quick actions (view, edit, delete)

### Real-Time Updates
- Live status updates during document processing
- Seamless data flow from upload to database
- Automatic table refresh after operations

## Prerequisites

- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Backend API running (see [back-end README](../back-end/README.md))

## Installation

```bash
# Navigate to front-end directory
cd front-end

# Install dependencies
npm install
```

## Configuration

The frontend connects to the backend API. By default, it expects the API to be running at `http://localhost:5000`. This is configured in `lib/api.ts`.

If your backend is running on a different URL, update the `API_BASE_URL` constant in `lib/api.ts`:

```typescript
const API_BASE_URL = 'http://your-backend-url:port';
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Production Build

```bash
# Build the application
npm run build

# Start the production server
npm start
```

The production server will run on `http://localhost:3000` by default.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Create optimized production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## Key Components

### SalesOrderTable
The main component displaying all sales orders in a table format. Features:
- Pagination and sorting
- Expandable rows for order details
- Inline editing capabilities
- Delete functionality

### SalesOrderFormSheet
A slide-out sheet component for reviewing and editing extracted invoice data. Features:
- Form validation
- Customer and product selection
- Line item management
- Submit and cancel actions

### API Client (`lib/api.ts`)
Centralized API client with:
- Type-safe endpoint definitions
- Error handling
- Request/response type definitions

## Styling

The application uses Tailwind CSS for styling with:
- Custom color scheme and design tokens
- Responsive design patterns
- Dark mode support
- Consistent spacing and typography

Global styles are defined in `app/globals.css`, and component-specific styles use Tailwind utility classes.

## Type Safety

The application is fully typed with TypeScript. Key type definitions are in `lib/types.ts`:
- `SalesOrderHeader` - Sales order header data structure
- `SalesOrderDetail` - Line item data structure
- `ExtractedData` - Data structure returned from document extraction
- `SalesOrderFormData` - Form data structure for review/edit

## Development Tips

- The app uses Next.js App Router, so all routes are defined in the `app/` directory
- Components are client-side by default; use `"use client"` directive when needed
- API calls are made from client components using the Fetch API
- State management uses React hooks (useState, useRef, etc.)

## Troubleshooting

**API Connection Issues:**
- Ensure the backend is running on `http://localhost:5000`
- Check CORS settings in the backend if requests are blocked
- Verify the API endpoint URLs in `lib/api.ts`

**Build Errors:**
- Clear `.next` directory and rebuild: `rm -rf .next && npm run build`
- Ensure all dependencies are installed: `npm install`

**Type Errors:**
- Run `npm run lint` to identify type issues
- Ensure TypeScript version is compatible (5+)

## Deployment

For production deployment:

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy to a hosting platform:**
   - **Vercel** (recommended for Next.js): Connect your repository and deploy
   - **Netlify**: Use the Next.js build preset
   - **Self-hosted**: Use `npm start` with a process manager like PM2

3. **Environment Configuration:**
   - Update API endpoint URLs for production
   - Configure environment variables if needed
   - Set up proper CORS policies

4. **Optimization:**
   - Enable Next.js Image Optimization
   - Configure CDN for static assets
   - Set up caching headers

## Related Documentation

- [Main Project README](../README.md) - Full project overview and architecture
- [Back-End README](../back-end/README.md) - Backend API documentation

## License

This project was created as a technical case study demonstration.
