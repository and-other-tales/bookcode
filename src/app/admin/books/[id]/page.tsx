"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Download, RefreshCw, Trash2, Eye, Upload, Palette } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Page {
  id: string
  pageNumber: number
  code: string
  audioLink: string
  imageUrl: string
}

interface Book {
  id: string
  title: string
  author: string
  isbn: string | null
  pageCount: number
  pages: Page[]
  _count: {
    pages: number
  }
}

export default function BookDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const bookId = params.id as string

  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [audioLinks, setAudioLinks] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [previewCode, setPreviewCode] = useState<Page | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)

  const fetchBook = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/books/${bookId}`)
      if (response.ok) {
        const data = await response.json()
        setBook(data)
      } else if (response.status === 404) {
        router.push("/admin/dashboard")
      }
    } catch (error) {
      console.error("Error fetching book:", error)
    } finally {
      setLoading(false)
    }
  }, [bookId, router])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session && bookId) {
      fetchBook()
    }
  }, [session, bookId, fetchBook])

  async function handleGenerateCodes() {
    if (!audioLinks.trim()) {
      toast({
        title: "Error",
        description: "Please enter audio links first",
        variant: "destructive",
      })
      return
    }

    const links = audioLinks
      .split("\n")
      .map((link) => link.trim())
      .filter((link) => link)

    if (links.length === 0) {
      toast({
        title: "Error",
        description: "No valid audio links found",
        variant: "destructive",
      })
      return
    }

    // Validate URLs
    const invalidLinks = links.filter((link) => {
      try {
        new URL(link)
        return false
      } catch {
        return true
      }
    })

    if (invalidLinks.length > 0) {
      toast({
        title: "Error",
        description: `Invalid URLs found on lines: ${invalidLinks.map((_, i) => i + 1).join(", ")}`,
        variant: "destructive",
      })
      return
    }

    try {
      setGenerating(true)
      setGenerationProgress(0)

      const audioLinksData = links.map((audioLink, index) => ({
        pageNumber: index + 1,
        audioLink,
      }))

      const response = await fetch(`/api/admin/books/${bookId}/generate-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioLinks: audioLinksData }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate codes")
      }

      const result = await response.json()

      if (result.failedPages > 0) {
        toast({
          title: "Partial Success",
          description: `Generated ${result.successfulPages} of ${result.totalPages} codes`,
        })
      } else {
        toast({
          title: "Success",
          description: `Generated ${result.successfulPages} codes`,
        })
      }

      setAudioLinks("")
      fetchBook()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate codes",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
      setGenerationProgress(0)
    }
  }

  async function handleRegeneratePage(pageId: string) {
    try {
      setRegenerating(pageId)
      const response = await fetch(`/api/admin/pages/${pageId}/regenerate`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to regenerate code")
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: `Regenerated code: ${result.oldCode} -> ${result.newCode}`,
      })
      fetchBook()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate code",
        variant: "destructive",
      })
    } finally {
      setRegenerating(null)
    }
  }

  async function handleDownload() {
    try {
      toast({
        title: "Preparing download",
        description: "Generating ZIP file...",
      })

      const response = await fetch(`/api/admin/books/${bookId}/download`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to download")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "codes.zip"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "Download started",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download",
        variant: "destructive",
      })
    }
  }

  async function handleDelete() {
    try {
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete book")
      }

      toast({
        title: "Success",
        description: "Book deleted successfully",
      })
      router.push("/admin/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete book",
        variant: "destructive",
      })
    }
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").slice(1) // Skip header
      const links = lines
        .map((line) => {
          const parts = line.split(",")
          return parts[1]?.trim().replace(/^"|"$/g, "") || ""
        })
        .filter((link) => link)
      setAudioLinks(links.join("\n"))
      toast({
        title: "CSV loaded",
        description: `Found ${links.length} audio links`,
      })
    }
    reader.readAsText(file)
  }

  if (status === "loading" || loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Book not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/admin/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Book Info */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{book.title}</CardTitle>
              <CardDescription>by {book.author}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/books/${book.id}/theme`}>
                <Button variant="outline" size="sm">
                  <Palette className="mr-2 h-4 w-4" />
                  Customize Theme
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Book
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the book and all generated codes.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <span className="text-muted-foreground">ISBN:</span>{" "}
                {book.isbn || "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground">Page Count:</span>{" "}
                {book.pageCount}
              </div>
              <div>
                <span className="text-muted-foreground">Codes Generated:</span>{" "}
                {book.pages.length}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Codes */}
        {book.pages.length === 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Generate Wave Codes</CardTitle>
              <CardDescription>
                Enter one audio link per line, or upload a CSV file with columns: page_number, audio_link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audioLinks">Audio Links (one per line)</Label>
                <Textarea
                  id="audioLinks"
                  value={audioLinks}
                  onChange={(e) => setAudioLinks(e.target.value)}
                  placeholder="https://example.com/audio1.mp3&#10;https://example.com/audio2.mp3&#10;https://example.com/audio3.mp3"
                  rows={10}
                />
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="csvUpload" className="cursor-pointer">
                  <div className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    Upload CSV
                  </div>
                  <Input
                    id="csvUpload"
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </Label>
              </div>

              {generating && (
                <div className="space-y-2">
                  <Progress value={generationProgress} />
                  <p className="text-sm text-muted-foreground">
                    Generating codes...
                  </p>
                </div>
              )}

              <Button onClick={handleGenerateCodes} disabled={generating || !audioLinks.trim()}>
                {generating ? "Generating..." : "Generate Codes"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Generated Pages */}
        {book.pages.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Generated Codes</CardTitle>
                <CardDescription>
                  {book.pages.length} pages with wave codes
                </CardDescription>
              </div>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download ZIP
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Page</TableHead>
                    <TableHead className="w-32">Code</TableHead>
                    <TableHead>Audio Link</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {book.pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell>{page.pageNumber}</TableCell>
                      <TableCell className="font-mono">{page.code}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                        {page.audioLink}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewCode(page)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegeneratePage(page.id)}
                            disabled={regenerating === page.id}
                          >
                            <RefreshCw className={`h-4 w-4 ${regenerating === page.id ? "animate-spin" : ""}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Preview Modal */}
      <Dialog open={!!previewCode} onOpenChange={() => setPreviewCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Page {previewCode?.pageNumber} - Code: {previewCode?.code}</DialogTitle>
            <DialogDescription>
              Wave code preview for this page
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {previewCode?.imageUrl && (
              <div className="rounded-lg border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewCode.imageUrl}
                  alt={`Wave code ${previewCode.code}`}
                  className="h-auto w-48"
                />
              </div>
            )}
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-mono text-lg">{previewCode?.code}</p>
              <p className="mt-2 max-w-md break-all">{previewCode?.audioLink}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
