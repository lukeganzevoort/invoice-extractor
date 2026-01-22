import Link from "next/link";
import Image from "next/image";
import { FileText, Upload, Database, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/10 via-background to-primary/8 font-sans dark:bg-black">
      {/* Header */}
      <header className="border-b border-primary/20 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Document Extraction Case Study
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        {/* Introduction Section */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary dark:bg-primary/20 dark:text-primary-foreground">
            <FileText className="h-4 w-4" />
            Case Study
          </div>
          <h2 className="mb-4 text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent sm:text-5xl">
            AI-Powered Document Extraction Application
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            This project demonstrates a complete document extraction solution built for a technical case study,
            showcasing problem-solving approach, strategic thinking, and technical capabilities.
          </p>
          <div className="mt-6">
            <Link href="/dashboard">
              <Button size="lg">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Case Study Overview */}
        <div className="mb-16 rounded-2xl bg-white p-8 shadow-sm border border-primary/20 dark:bg-zinc-900 dark:border-primary/20">
          <h3 className="mb-6 text-2xl font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Case Study Overview
          </h3>
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            This case study was designed to better understand approach to problem solving, strategic thinking,
            and highlight technical abilities. The application processes sales invoices and extracts structured
            data similar to what the Customer Intelligence team works with.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">
                Requirements
              </h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  React/Next.js frontend with Flask backend
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Document upload and LLM-based extraction
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Support for multiple invoice templates
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Structured data display and editing
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Real-time processing and database persistence
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">
                Key Features
              </h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Intelligent invoice parsing using LLM APIs
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Clean, user-friendly interface for data review
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Inline editing of extracted metadata
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Database storage with SQLAlchemy ORM
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Scalable architecture for production deployment
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Screenshot Gallery */}
        <div className="mb-16">
          <h3 className="mb-6 text-2xl font-semibold text-center bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Application Screenshots
          </h3>
          <p className="mb-8 text-center text-zinc-600 dark:text-zinc-400">
            Explore the user journey through the application
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-sm border border-primary/20 dark:bg-zinc-900 dark:border-primary/20 overflow-hidden">
              <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src="/docs/homepage.png"
                  alt="Homepage - Landing page introducing the case study"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <h4 className="text-sm font-semibold text-black dark:text-zinc-50 mb-1">
                Homepage
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Landing page introducing the case study and application capabilities
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-primary/20 dark:bg-zinc-900 dark:border-primary/20 overflow-hidden">
              <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src="/docs/sales_order_dashboard.png"
                  alt="Sales Orders Dashboard - Main dashboard with sales orders table"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <h4 className="text-sm font-semibold text-black dark:text-zinc-50 mb-1">
                Sales Orders Dashboard
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Interactive table displaying all imported sales orders
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-primary/20 dark:bg-zinc-900 dark:border-primary/20 overflow-hidden">
              <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src="/docs/review_sales_orders_after_importing.png"
                  alt="Review Sales Orders - Data review interface after extraction"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <h4 className="text-sm font-semibold text-black dark:text-zinc-50 mb-1">
                Review & Edit
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Review and edit extracted invoice data before saving
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-primary/20 dark:bg-zinc-900 dark:border-primary/20 overflow-hidden">
              <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src="/docs/view_sales_order_details.png"
                  alt="View Sales Order Details - Detailed view of sales order information"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <h4 className="text-sm font-semibold text-black dark:text-zinc-50 mb-1">
                Order Details
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Comprehensive view of sales order with line items and metadata
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-primary/20 dark:bg-zinc-900 dark:border-primary/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
              Document Upload
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Upload invoices in various formats and templates for processing
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-primary/20 dark:bg-zinc-900 dark:border-primary/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
              Real-time Processing
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Fast, seamless extraction with immediate UI updates
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-primary/20 dark:bg-zinc-900 dark:border-primary/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
              Data Management
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              View, edit, and persist extracted data in a structured database
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-12 text-center shadow-lg">
          <h3 className="mb-4 text-3xl font-bold text-primary-foreground">
            Ready to explore the application?
          </h3>
          <p className="mb-8 text-primary-foreground/80">
            Navigate to the dashboard to upload invoices and see the extraction in action
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="bg-background text-primary hover:bg-background/90 shadow-md">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/20 bg-white/80 backdrop-blur-sm py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>Built as a technical case study demonstration</p>
        </div>
      </footer>
    </div>
  );
}
