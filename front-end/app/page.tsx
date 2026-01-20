import Link from "next/link";
import { FileText, Upload, Database, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Document Extraction Case Study
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        {/* Introduction Section */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <FileText className="h-4 w-4" />
            Case Study
          </div>
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
            AI-Powered Document Extraction Application
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            This project demonstrates a complete document extraction solution built for a technical case study,
            showcasing problem-solving approach, strategic thinking, and technical capabilities.
          </p>
          <div className="mt-6">
            <Link href="/dashboard">
              <Button size="lg" >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Case Study Overview */}
        <div className="mb-16 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
          <h3 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
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
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  React/Next.js frontend with Flask backend
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  Document upload and LLM-based extraction
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  Support for multiple invoice templates
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  Structured data display and editing
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
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
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  Intelligent invoice parsing using LLM APIs
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  Clean, user-friendly interface for data review
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  Inline editing of extracted metadata
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  Database storage with SQLAlchemy ORM
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  Scalable architecture for production deployment
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
              Document Upload
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Upload invoices in various formats and templates for processing
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
              Real-time Processing
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Fast, seamless extraction with immediate UI updates
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
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
        <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-12 text-center dark:from-zinc-800 dark:to-zinc-900">
          <h3 className="mb-4 text-3xl font-bold text-white">
            Ready to explore the application?
          </h3>
          <p className="mb-8 text-zinc-300">
            Navigate to the dashboard to upload invoices and see the extraction in action
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>Built as a technical case study demonstration</p>
        </div>
      </footer>
    </div>
  );
}
