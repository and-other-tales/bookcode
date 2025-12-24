"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const bookSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  author: z.string().min(1, "Author is required").max(255),
  isbn: z.string().optional(),
  pageCount: z.number().int().min(1, "Page count must be at least 1").max(10000),
})

type BookFormData = z.infer<typeof bookSchema>

export default function NewBookPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: "",
      author: "",
      isbn: "",
      pageCount: 1,
    },
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login")
    }
  }, [status, router])

  async function onSubmit(data: BookFormData) {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create book")
      }

      const book = await response.json()
      toast({
        title: "Book created",
        description: "Now add audio links to generate codes.",
      })
      router.push(`/admin/books/${book.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create book",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
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

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Book</CardTitle>
            <CardDescription>
              Enter the book details. You can add audio links after creating the book.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="Enter book title"
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  {...register("author")}
                  placeholder="Enter author name"
                />
                {errors.author && (
                  <p className="text-sm text-red-600">{errors.author.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN (optional)</Label>
                <Input
                  id="isbn"
                  {...register("isbn")}
                  placeholder="Enter ISBN"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pageCount">Page Count *</Label>
                <Input
                  id="pageCount"
                  type="number"
                  {...register("pageCount", { valueAsNumber: true })}
                  placeholder="Enter number of pages"
                  min={1}
                />
                {errors.pageCount && (
                  <p className="text-sm text-red-600">{errors.pageCount.message}</p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Book"}
                </Button>
                <Link href="/admin/dashboard">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
