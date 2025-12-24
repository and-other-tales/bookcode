"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, RotateCcw, RefreshCw, AlertTriangle } from "lucide-react"
import { ThemeConfig, DEFAULT_THEME, PRESET_THEMES, ThemeValidationWarning } from "@/lib/types/theme"

interface PreviewSample {
  code: string
  imageUrl: string
}

export default function ThemeEditorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string

  const [bookTitle, setBookTitle] = useState("")
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME)
  const [, setOriginalTheme] = useState<ThemeConfig>(DEFAULT_THEME)
  const [warnings, setWarnings] = useState<ThemeValidationWarning[]>([])
  const [previews, setPreviews] = useState<PreviewSample[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login")
    }
  }, [status, router])

  const fetchPreviews = useCallback(async (themeConfig: ThemeConfig) => {
    try {
      setPreviewLoading(true)
      const response = await fetch(`/api/admin/books/${bookId}/theme-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeConfig }),
      })
      if (response.ok) {
        const data = await response.json()
        setPreviews(data.samples)
      }
    } catch (error) {
      console.error("Error fetching previews:", error)
    } finally {
      setPreviewLoading(false)
    }
  }, [bookId])

  const fetchTheme = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/books/${bookId}/theme`)
      if (response.ok) {
        const data = await response.json()
        setBookTitle(data.bookTitle)
        setTheme(data.themeConfig)
        setOriginalTheme(data.themeConfig)
        setWarnings(data.warnings || [])
        fetchPreviews(data.themeConfig)
      }
    } catch (error) {
      console.error("Error fetching theme:", error)
    } finally {
      setLoading(false)
    }
  }, [bookId, fetchPreviews])

  useEffect(() => {
    if (session && bookId) {
      fetchTheme()
    }
  }, [session, bookId, fetchTheme])

  // Debounced preview update
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreviews(theme)
    }, 300)
    return () => clearTimeout(timer)
  }, [theme, fetchPreviews])

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/books/${bookId}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeConfig: theme }),
      })
      if (response.ok) {
        const data = await response.json()
        setWarnings(data.warnings || [])
        setOriginalTheme(theme)
        alert("Theme saved successfully!")
      } else {
        alert("Failed to save theme")
      }
    } catch (error) {
      console.error("Error saving theme:", error)
      alert("Failed to save theme")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm("Reset theme to default? This cannot be undone.")) return
    try {
      const response = await fetch(`/api/admin/books/${bookId}/theme`, {
        method: "DELETE",
      })
      if (response.ok) {
        setTheme(DEFAULT_THEME)
        setOriginalTheme(DEFAULT_THEME)
        setWarnings([])
        alert("Theme reset to default")
      }
    } catch (error) {
      console.error("Error resetting theme:", error)
    }
  }

  const handleRegenerateAll = async () => {
    if (!confirm("Regenerate all code images with the current theme? This may take a while.")) return
    try {
      setRegenerating(true)
      const response = await fetch(`/api/admin/books/${bookId}/regenerate-with-theme`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (response.ok) {
        const data = await response.json()
        alert(`Regenerated ${data.regenerated} pages`)
      } else {
        alert("Failed to regenerate codes")
      }
    } catch (error) {
      console.error("Error regenerating:", error)
      alert("Failed to regenerate codes")
    } finally {
      setRegenerating(false)
    }
  }

  const handlePresetChange = (presetName: string) => {
    const preset = PRESET_THEMES[presetName]
    if (preset) {
      setTheme({
        ...DEFAULT_THEME,
        ...preset,
        colorScheme: { ...DEFAULT_THEME.colorScheme, ...preset.colorScheme },
        barStyle: { ...DEFAULT_THEME.barStyle, ...preset.barStyle },
        effects: { ...DEFAULT_THEME.effects, ...preset.effects },
        dimensions: { ...DEFAULT_THEME.dimensions, ...preset.dimensions },
      })
    }
  }

  const updateColorScheme = (updates: Partial<ThemeConfig["colorScheme"]>) => {
    setTheme((prev) => ({
      ...prev,
      colorScheme: { ...prev.colorScheme, ...updates },
    }))
  }

  const updateBarStyle = (updates: Partial<ThemeConfig["barStyle"]>) => {
    setTheme((prev) => ({
      ...prev,
      barStyle: { ...prev.barStyle, ...updates },
    }))
  }

  const updateEffects = (updates: Partial<ThemeConfig["effects"]>) => {
    setTheme((prev) => ({
      ...prev,
      effects: { ...prev.effects, ...updates },
    }))
  }

  const updateDimensions = (updates: Partial<ThemeConfig["dimensions"]>) => {
    setTheme((prev) => ({
      ...prev,
      dimensions: { ...prev.dimensions, ...updates },
    }))
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href={`/admin/books/${bookId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Book
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Theme Editor: {bookTitle}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Theme"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Preset Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Preset Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset theme..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic (Black & White)</SelectItem>
                    <SelectItem value="elegantGold">Elegant Gold</SelectItem>
                    <SelectItem value="oceanBlue">Ocean Blue</SelectItem>
                    <SelectItem value="forestGreen">Forest Green</SelectItem>
                    <SelectItem value="sunsetGradient">Sunset Gradient</SelectItem>
                    <SelectItem value="midnightPurple">Midnight Purple</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Color Scheme */}
            <Card>
              <CardHeader>
                <CardTitle>Color Scheme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={theme.colorScheme.type}
                    onValueChange={(v) => updateColorScheme({ type: v as "solid" | "gradient" | "dual-tone" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="gradient">Gradient</SelectItem>
                      <SelectItem value="dual-tone">Dual-tone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={theme.colorScheme.primary}
                        onChange={(e) => updateColorScheme({ primary: e.target.value })}
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={theme.colorScheme.primary}
                        onChange={(e) => updateColorScheme({ primary: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  {(theme.colorScheme.type === "gradient" || theme.colorScheme.type === "dual-tone") && (
                    <div>
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={theme.colorScheme.secondary || "#666666"}
                          onChange={(e) => updateColorScheme({ secondary: e.target.value })}
                          className="h-10 w-16 p-1"
                        />
                        <Input
                          value={theme.colorScheme.secondary || ""}
                          onChange={(e) => updateColorScheme({ secondary: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={theme.colorScheme.background}
                      onChange={(e) => updateColorScheme({ background: e.target.value })}
                      className="h-10 w-16 p-1"
                    />
                    <Input
                      value={theme.colorScheme.background}
                      onChange={(e) => updateColorScheme({ background: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                {theme.colorScheme.type === "gradient" && (
                  <div>
                    <Label>Gradient Angle: {theme.colorScheme.gradientAngle || 90}°</Label>
                    <Input
                      type="range"
                      min="0"
                      max="360"
                      value={theme.colorScheme.gradientAngle || 90}
                      onChange={(e) => updateColorScheme({ gradientAngle: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Style */}
            <Card>
              <CardHeader>
                <CardTitle>Bar Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Shape</Label>
                  <Select
                    value={theme.barStyle.shape}
                    onValueChange={(v) => updateBarStyle({ shape: v as ThemeConfig["barStyle"]["shape"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rectangle">Rectangle</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="triangle">Triangle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Thickness: {theme.barStyle.thickness}</Label>
                  <Input
                    type="range"
                    min="1"
                    max="10"
                    value={theme.barStyle.thickness}
                    onChange={(e) => updateBarStyle({ thickness: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Spacing: {theme.barStyle.spacing}</Label>
                  <Input
                    type="range"
                    min="1"
                    max="5"
                    value={theme.barStyle.spacing}
                    onChange={(e) => updateBarStyle({ spacing: parseInt(e.target.value) })}
                  />
                </div>
                {theme.barStyle.shape === "rounded" && (
                  <div>
                    <Label>Roundness: {theme.barStyle.roundness || 0}%</Label>
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      value={theme.barStyle.roundness || 0}
                      onChange={(e) => updateBarStyle({ roundness: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Effects */}
            <Card>
              <CardHeader>
                <CardTitle>Effects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shadow"
                    checked={theme.effects.shadow}
                    onChange={(e) => updateEffects({ shadow: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="shadow">Enable Shadow</Label>
                </div>
                {theme.effects.shadow && (
                  <>
                    <div>
                      <Label>Shadow Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={theme.effects.shadowColor || "#000000"}
                          onChange={(e) => updateEffects({ shadowColor: e.target.value })}
                          className="h-10 w-16 p-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Shadow Blur: {theme.effects.shadowBlur || 2}</Label>
                      <Input
                        type="range"
                        min="0"
                        max="10"
                        value={theme.effects.shadowBlur || 2}
                        onChange={(e) => updateEffects({ shadowBlur: parseInt(e.target.value) })}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label>Opacity: {theme.effects.opacity}%</Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={theme.effects.opacity}
                    onChange={(e) => updateEffects({ opacity: parseInt(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardHeader>
                <CardTitle>Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Width (mm)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="100"
                      value={theme.dimensions.width}
                      onChange={(e) => updateDimensions({ width: parseInt(e.target.value) || 15 })}
                    />
                  </div>
                  <div>
                    <Label>Height (mm)</Label>
                    <Input
                      type="number"
                      min="3"
                      max="50"
                      value={theme.dimensions.height}
                      onChange={(e) => updateDimensions({ height: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>DPI (Print Quality)</Label>
                  <Select
                    value={theme.dimensions.dpi.toString()}
                    onValueChange={(v) => updateDimensions({ dpi: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">300 DPI (Standard)</SelectItem>
                      <SelectItem value="600">600 DPI (High Quality)</SelectItem>
                      <SelectItem value="1200">1200 DPI (Ultra High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            {/* Warnings */}
            {warnings.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-5 w-5" />
                    Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {warnings.map((warning, i) => (
                      <li
                        key={i}
                        className={`text-sm ${
                          warning.severity === "error" ? "text-red-600" : "text-yellow-700"
                        }`}
                      >
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Live Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Live Preview</span>
                  {previewLoading && (
                    <span className="text-sm text-muted-foreground">Updating...</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {previews.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No preview available
                    </p>
                  ) : (
                    previews.map((preview) => (
                      <div
                        key={preview.code}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                        style={{ backgroundColor: theme.colorScheme.background }}
                      >
                        <img
                          src={preview.imageUrl}
                          alt={`Code: ${preview.code}`}
                          className="h-16"
                        />
                        <span className="font-mono text-sm">{preview.code}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleRegenerateAll}
                  disabled={regenerating}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
                  {regenerating ? "Regenerating..." : "Apply Theme & Regenerate All Codes"}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  This will regenerate all code images with the saved theme.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
