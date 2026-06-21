# Go Tutorial — postctl

Dieses Tutorial führt dich durch Go anhand des postctl-Projekts. Jede Phase baut ein Feature und lehrt neue Go-Konzepte.

## Kurs-Konzept

Dieses Tutorial wird parallel zum Projekt geschrieben und kann als bezahlter Kurs veröffentlicht werden:

- **Format**: Video-Serie (Screen Recording + Voiceover) + geschriebenes Tutorial
- **Titel**: "Build a real CLI tool in Go — from zero to production"
- **Zielgruppe**: Entwickler die Go lernen wollen anhand eines echten Projekts
- **Teaser**: Phase 1 + 2 gratis als Blog-Posts auf Dev.to (Traffic + Leads)
- **Vollversion**: Phase 3-7 als bezahlter Kurs ($49-79)
- **Plattform**: eigene Seite (Lemon Squeezy) oder Udemy
- **Sprachen**: Deutsch (primär) + Englisch

Jede Phase endet mit einer **Challenge** — einer Aufgabe die der Lerner selbst löst bevor er die Lösung sieht.

---

## Voraussetzungen

```bash
# Go installieren
brew install go

# Version prüfen (1.22+)
go version

# Editor: VS Code + Go Extension (gopls)
code --install-extension golang.go
```

## Phase 1: Hello Go — Projekt Setup

### Was wir bauen
Grundgerüst mit Cobra CLI: `postctl version`, `postctl help`

### Go-Konzepte
- **Go Modules**: Dependency Management (`go.mod`)
- **Packages**: Code-Organisation in Ordnern
- **`func main()`**: Entry Point
- **`fmt.Println`**: Output
- **Strings**: String Formatting mit `fmt.Sprintf`

### Schritte

```bash
# 1. Projekt erstellen
mkdir postctl && cd postctl
go mod init github.com/aeon022/postctl

# 2. Cobra installieren
go get github.com/spf13/cobra@latest

# 3. Datei erstellen
mkdir -p cmd
```

**`main.go`** — Entry Point:
```go
package main

import "github.com/aeon022/postctl/cmd"

func main() {
    cmd.Execute()
}
```

**`cmd/root.go`** — Root Command:
```go
package cmd

import (
    "fmt"
    "os"

    "github.com/spf13/cobra"
)

// Version — wird beim Build gesetzt
var Version = "dev"

var rootCmd = &cobra.Command{
    Use:   "postctl",
    Short: "Social media posting from the terminal",
    Long:  "postctl manages social media posts from Markdown files.\nTwitter/X, LinkedIn, and Threads — from one CLI.",
}

// Execute — wird von main() aufgerufen
func Execute() {
    if err := rootCmd.Execute(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}

func init() {
    // Version subcommand
    rootCmd.AddCommand(&cobra.Command{
        Use:   "version",
        Short: "Print version",
        Run: func(cmd *cobra.Command, args []string) {
            fmt.Printf("postctl %s\n", Version)
        },
    })
}
```

```bash
# Testen
go run . version
# → postctl dev

# Binary bauen
go build -o postctl .
./postctl version
```

### 🎓 Gelernt
- `go mod init` erstellt ein Modul
- `go get` installiert Dependencies
- `package main` + `func main()` = Programm-Start
- Cobra strukturiert CLI Commands als Baumstruktur
- `&cobra.Command{}` = Pointer zu einem Struct

---

## Phase 2: Structs & Models — Datenstruktur

### Was wir bauen
Post-Datenmodell: `Post`, `Tweet`, `Campaign` Structs

### Go-Konzepte
- **Structs**: Custom Types
- **Felder + Tags**: JSON/YAML Tags für Serialisierung
- **Methoden**: Funktionen auf Structs
- **Slices**: Dynamische Arrays
- **Enums via Konstanten**: `const StatusDraft = "draft"`

### Code

**`internal/models/post.go`**:
```go
package models

import "time"

// Status-Konstanten
const (
    StatusDraft     = "draft"
    StatusScheduled = "scheduled"
    StatusPosted    = "posted"
    StatusFailed    = "failed"
    StatusPartial   = "partial"
)

// Platform-Konstanten
const (
    PlatformTwitter  = "twitter"
    PlatformLinkedIn = "linkedin"
    PlatformThreads  = "threads"
)

// Post repräsentiert einen Social-Media-Post
type Post struct {
    ID          string    `json:"id" yaml:"id"`
    Platform    string    `json:"platform" yaml:"platform"`
    Type        string    `json:"type" yaml:"type"`           // thread, single, article
    Language    string    `json:"language" yaml:"language"`
    Campaign    string    `json:"campaign" yaml:"campaign"`
    Title       string    `json:"title" yaml:"title"`
    Tweets      []Tweet   `json:"tweets" yaml:"tweets"`       // Für Threads
    Body        string    `json:"body" yaml:"body"`            // Für Singles
    Images      []string  `json:"images" yaml:"images"`
    Tags        []string  `json:"tags" yaml:"tags"`
    Status      string    `json:"status" yaml:"status"`
    ScheduledAt *time.Time `json:"scheduled_at" yaml:"schedule"`
    PostedAt    *time.Time `json:"posted_at" yaml:"posted_at"`
    PlatformID  string    `json:"platform_id" yaml:"platform_id"`
    Error       string    `json:"error" yaml:"error"`
    SourceFile  string    `json:"source_file" yaml:"source_file"`
    CreatedAt   time.Time `json:"created_at" yaml:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" yaml:"updated_at"`
}

// Tweet ist ein einzelner Tweet in einem Thread
type Tweet struct {
    Index   int    `json:"index"`
    Content string `json:"content"`
    Image   string `json:"image"`   // Optionaler Bild-Pfad
    IsReply bool   `json:"is_reply"` // Letzter Tweet = Reply mit Links
}

// CharCount gibt die Zeichenanzahl zurück (URLs = 23 Zeichen)
func (t Tweet) CharCount() int {
    // Vereinfacht — Twitter zählt URLs als 23 Zeichen
    return len([]rune(t.Content))
}

// IsValid prüft ob der Tweet innerhalb des Limits ist
func (t Tweet) IsValid() bool {
    return t.CharCount() <= 280
}

// Campaign gruppiert Posts
type Campaign struct {
    Slug     string
    Posts    []Post
    Posted   int
    Drafts   int
    Scheduled int
}
```

```bash
# Kompiliert? 
go build ./internal/models/
```

### 🎓 Gelernt
- Structs sind Go's "Klassen" (ohne Vererbung)
- `json:"name"` Tags steuern JSON-Serialisierung
- `*time.Time` = Pointer, kann `nil` sein (= optional)
- `[]Tweet` = Slice von Tweets (dynamisches Array)
- Methoden: `func (t Tweet) CharCount() int` — Methode auf Tweet
- `[]rune(s)` konvertiert String zu Unicode-Zeichen (für korrekte Länge)

---

## Phase 3: Markdown Parser — Dateien einlesen

### Was wir bauen
`postctl import ./posts/` — liest Markdown-Dateien und erstellt Posts

### Go-Konzepte
- **File I/O**: `os.ReadFile`, `filepath.Walk`
- **String-Manipulation**: `strings.Split`, `strings.TrimSpace`
- **Regular Expressions**: `regexp.MustCompile`
- **Error Handling**: `if err != nil { return err }`
- **YAML Parsing**: External Package
- **Unit Tests**: `func TestParseTweets(t *testing.T)`

### 🎓 Gelernt
- `os.ReadFile` liest eine ganze Datei
- `filepath.Walk` iteriert über Verzeichnisse
- `strings.SplitN(s, "---", 3)` splittet Frontmatter
- `regexp.MustCompile` für Pattern Matching
- `t.Run("name", func(t *testing.T) { ... })` für Sub-Tests
- Error Handling ist explizit — kein try/catch

---

## Phase 4: SQLite Store — Daten speichern

### Go-Konzepte
- **Interfaces**: `Store` Interface definieren
- **SQL**: `database/sql` Standard-Paket
- **Prepared Statements**: SQL Injection verhindern
- **Migrations**: Schema-Versionierung
- **`defer`**: Resource Cleanup (`defer db.Close()`)

### 🎓 Gelernt
- `interface{}` definiert Verhalten, nicht Struktur
- `defer` führt Code am Funktions-Ende aus (wie `finally`)
- `db.QueryRow().Scan(&var)` liest Werte direkt in Variablen
- `_` ignoriert Return-Werte die du nicht brauchst

---

## Phase 5: TUI — Terminal Interface

### Go-Konzepte
- **Bubbletea Elm-Architektur**: Model → Update → View
- **tea.Msg**: Message-basierte Kommunikation
- **tea.Cmd**: Async Side-Effects
- **Lipgloss**: Styling mit Methoden-Chaining
- **Composition**: Kleine Komponenten zusammenbauen

### Bubbletea Grundprinzip
```go
// Model hält den State
type model struct {
    posts    []models.Post
    cursor   int
    selected string
}

// Init — wird einmal aufgerufen
func (m model) Init() tea.Cmd {
    return nil // Keine initiale Aktion
}

// Update — reagiert auf Events
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "q", "ctrl+c":
            return m, tea.Quit
        case "up", "k":
            if m.cursor > 0 { m.cursor-- }
        case "down", "j":
            if m.cursor < len(m.posts)-1 { m.cursor++ }
        }
    }
    return m, nil
}

// View — rendert den Screen (wird bei jedem Update aufgerufen)
func (m model) View() string {
    s := "Posts:\n\n"
    for i, p := range m.posts {
        cursor := " "
        if i == m.cursor { cursor = ">" }
        s += fmt.Sprintf("%s %s [%s]\n", cursor, p.Title, p.Status)
    }
    s += "\n↑↓ navigate · q quit"
    return s
}
```

### 🎓 Gelernt
- Elm-Architektur: unidirektionaler Datenfluss
- `switch msg := msg.(type)` = Type Switch (Go's Pattern Matching)
- `tea.Cmd` für async Operationen (API Calls etc.)
- Lipgloss: `lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#8b7cf8"))`

---

## Phase 6: APIs — Twitter, LinkedIn, Threads

### Go-Konzepte
- **HTTP Client**: `http.NewRequest`, `http.Client.Do`
- **OAuth 2.0**: Authorization Code Flow mit PKCE
- **Goroutines**: `go func() { ... }()`
- **Channels**: `ch := make(chan Result)`
- **Context**: `ctx, cancel := context.WithTimeout(ctx, 10*time.Second)`
- **`encoding/json`**: Request/Response Bodies
- **Interfaces**: `Platform` Interface für alle Plattformen

### Platform Interface
```go
type Platform interface {
    Name() string
    Auth(ctx context.Context) error
    Post(ctx context.Context, post *models.Post) (string, error)  // returns platform ID
    UploadImage(ctx context.Context, path string) (string, error) // returns media ID
    IsAuthenticated() bool
}
```

### 🎓 Gelernt
- Interfaces in Go sind implizit — kein `implements`
- Goroutines sind leichtgewichtig (~8KB Stack)
- Channels synchronisieren Goroutines
- `context.Context` für Timeouts und Cancellation
- `json.NewDecoder(resp.Body).Decode(&result)` parsed HTTP Response

---

## Phase 7: Scheduler & Polish

### Go-Konzepte
- **Ticker**: `time.NewTicker(30 * time.Second)`
- **Select**: `select { case <-ticker.C: ... case <-quit: return }`
- **Graceful Shutdown**: `signal.Notify(quit, os.Interrupt)`
- **Build Tags**: `go build -ldflags "-X cmd.Version=1.0.0"`
- **Cross-Compilation**: `GOOS=linux GOARCH=amd64 go build`

### 🎓 Gelernt
- `select` wartet auf mehrere Channels gleichzeitig
- `signal.Notify` fängt Ctrl+C ab
- Go cross-compiled ohne Extra-Tools
- Ein Binary für alles — keine Runtime-Dependencies

---

## Zusammenfassung: Go vs. JavaScript/TypeScript

| Konzept | JavaScript | Go |
|---------|-----------|-----|
| Package Manager | npm | `go mod` (built-in) |
| Types | TypeScript (optional) | Statisch (required) |
| Error Handling | try/catch | `if err != nil` |
| Async | Promise/async-await | Goroutines + Channels |
| Classes | class + prototype | Structs + Methoden |
| Interfaces | TypeScript interface | Implizit (duck typing) |
| Null | null/undefined | nil (nur für Pointer, Slices, Maps) |
| Build | webpack/esbuild | `go build` (built-in) |
| Output | node_modules + runtime | Single Binary |

---

## Ressourcen

- [Go Tour](https://go.dev/tour/) — interaktives Tutorial
- [Go by Example](https://gobyexample.com/) — Snippets für jedes Konzept
- [Effective Go](https://go.dev/doc/effective_go) — Idiomatisches Go
- [Bubbletea Docs](https://github.com/charmbracelet/bubbletea) — TUI Framework
- [Charm Examples](https://github.com/charmbracelet/bubbletea/tree/master/examples) — TUI Beispiele
