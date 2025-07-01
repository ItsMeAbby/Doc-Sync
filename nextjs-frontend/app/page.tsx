import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FaBook, FaLightbulb, FaEdit, FaPlus } from "react-icons/fa";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="text-center max-w-3xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">
          Doc-Sync
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8">
          Keep your documentation up-to-date with AI-powered suggestions
        </p>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 flex flex-col items-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mb-3">
                <FaLightbulb className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="font-medium text-lg mb-2">1. Describe Changes</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">Enter a natural language description of your product update or documentation change</p>
            </Card>
            <Card className="p-4 flex flex-col items-center">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full mb-3">
                <FaBook className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="font-medium text-lg mb-2">2. Review Suggestions</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">AI identifies affected documentation and suggests updates based on your changes</p>
            </Card>
            <Card className="p-4 flex flex-col items-center">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full mb-3">
                <FaEdit className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="font-medium text-lg mb-2">3. Approve & Save</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">Review, edit, and approve the suggested changes before they're applied</p>
            </Card>
          </div>
        </div>

        {/* Link to Documentation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/documentation">
            <Button className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-semibold rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 focus:ring-4 focus:ring-blue-300">
              View Documentation
            </Button>
          </Link>
          <Link href="/create-document">
            <Button className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-semibold rounded-full shadow-lg bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600 focus:ring-4 focus:ring-green-300">
              <FaPlus className="mr-2" />
              Create Document
            </Button>
          </Link>
          <Link href="/documentation-change">
            <Button className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-semibold rounded-full shadow-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 focus:ring-4 focus:ring-orange-300">
              <FaLightbulb className="mr-2" />
              Suggest Changes
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
