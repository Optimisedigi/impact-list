# Impact List

AI-powered task management app that helps prioritise work by calculating leverage scores, tracking time, and surfacing high-impact tasks.

Built with Next.js 16, React 19, SQLite, and Tailwind CSS.

## Features

- **AI Task Scoring**: Automatically scores tasks on priority (urgency) and leverage (strategic impact) against your 90-day goals
- **Focus Board**: Daily command centre showing your top 3 priority tasks with drag-and-drop reordering
- **Time Tracking**: Built-in timer with multi-task support, hours logging on completion
- **Analytics**: Time allocation charts, leverage trends, category breakdowns, completion heatmaps
- **Priority Matrix**: Eisenhower matrix view of all tasks
- **Recurring Tasks**: Auto-generated tasks on weekly/fortnightly/monthly schedules
- **Voice Input**: Add tasks via voice with AI-powered parsing
- **Business Context**: Configure your business details so AI scoring understands your strategic priorities

## Quick Start

```bash
git clone https://github.com/Optimisedigi/impact-list.git
cd impact-list
npm install
cp .env.example .env.local
# Edit .env.local with your AI provider (see below)
npm run db:push
npm run dev -- -p 3111
```

Open [http://localhost:3111](http://localhost:3111).

## AI Provider Setup

The app uses AI to score tasks and parse voice input. You can connect **any LLM** that speaks the OpenAI chat completions format, including completely free local options.

### Option 1: Ollama (free, runs locally)

1. Install Ollama: https://ollama.com
2. Pull a model: `ollama pull llama3`
3. Configure `.env.local`:

```env
AI_PROVIDER=openai
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3
```

### Option 2: Groq (free tier, cloud)

1. Sign up at https://console.groq.com
2. Create an API key (free tier available)
3. Configure `.env.local`:

```env
AI_PROVIDER=openai
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_your_key_here
AI_MODEL=llama-3.3-70b-versatile
```

### Option 3: OpenRouter (free models available, cloud)

1. Sign up at https://openrouter.ai
2. Create an API key
3. Configure `.env.local`:

```env
AI_PROVIDER=openai
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-your_key_here
AI_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

### Option 4: LM Studio (free, runs locally)

1. Download LM Studio: https://lmstudio.ai
2. Load a model and start the local server
3. Configure `.env.local`:

```env
AI_PROVIDER=openai
AI_BASE_URL=http://localhost:1234/v1
AI_MODEL=your-loaded-model
```

### Option 5: Anthropic Claude (paid)

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your_key_here
AI_MODEL=claude-haiku-4-5-20251001
```

### Using with MCP (Model Context Protocol)

If you have an MCP server that provides LLM access, you can connect it the same way as any OpenAI-compatible provider. MCP servers that expose an OpenAI-compatible HTTP endpoint work out of the box:

```env
AI_PROVIDER=openai
AI_BASE_URL=http://localhost:YOUR_MCP_PORT/v1
AI_API_KEY=your-mcp-token
AI_MODEL=your-model-name
```

For MCP servers that use stdio transport (like the ones configured in Claude Code's `mcp_servers` settings), you need a bridge that exposes them over HTTP. Tools like [mcp-proxy](https://github.com/nicholasgriffintn/mcp-proxy) can do this.

**How the AI provider works:** The app has a single abstraction layer at `src/lib/ai-provider.ts`. It supports two protocols:

1. **Anthropic** (`AI_PROVIDER=anthropic`): Uses the Anthropic Messages API format
2. **OpenAI-compatible** (`AI_PROVIDER=openai`): Uses the standard `/chat/completions` endpoint, which is supported by Ollama, Groq, OpenRouter, LM Studio, vLLM, and most other LLM providers

All you need is a URL that accepts `POST /chat/completions` with a JSON body containing `model`, `messages`, and `max_tokens`.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19
- **Language**: TypeScript (strict)
- **Database**: SQLite via LibSQL + Drizzle ORM
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Rich Text**: TipTap
- **Testing**: Vitest + Testing Library
- **Icons**: Lucide React
- **Drag and Drop**: dnd-kit

## Development

```bash
npm run dev -- -p 3111    # Start dev server
npm run lint              # Run ESLint
npx tsc --noEmit          # Type check
npm run test              # Run tests
npm run db:push           # Push schema changes to database
```

## License

MIT
