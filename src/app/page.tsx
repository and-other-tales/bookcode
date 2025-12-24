import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">BookCode</CardTitle>
          <CardDescription className="text-lg">
            Spotify-style Wave Code Generator for Books
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-muted-foreground">
            <p>
              Generate unique wave codes for book pages that link to audio content.
              Each code can be scanned by companion apps to play associated audio.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Link href="/admin/login" className="w-full">
              <Button className="w-full" size="lg">
                Admin Dashboard
              </Button>
            </Link>
          </div>

          <div className="border-t pt-6">
            <h3 className="mb-4 font-semibold">API Endpoint</h3>
            <div className="rounded-md bg-gray-100 p-4">
              <code className="text-sm">
                POST /api/validate
              </code>
              <pre className="mt-2 text-xs text-muted-foreground">
{`{
  "code": "J17D3Z"
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
