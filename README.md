# Defense AI Analyst

A **Defense Knowledge Graph + AI Analyst Agent** for processing and analyzing defense-related information with an interactive web interface.

## Features

- **Document Ingestion**: Extract entities and relationships from defense documents into a persistent knowledge graph
- **Interactive Graph Visualization**: Explore with filtering, search, deep linking, collapsible controls, and interactive minimap
- **AI-Powered Q&A**: Answer questions using structured reasoning over the knowledge graph with animated loading states
- **Dashboard Analytics**: Clickable analytics with contractor portfolios, system hierarchies, and intelligent question answering
- **Persistent Storage**: Neon Postgres database for reliable data persistence across sessions

## Architecture

```
defense-ai-analyst/
├── packages/                # Backend packages
│   ├── schema/              # Zod schemas for entities, relations, and triples
│   ├── graph-store/         # Neon Postgres graph database with Drizzle ORM
│   ├── ingestion/           # LLM-based entity/relation extraction
│   ├── analyst/             # Question answering engine
│   └── validation/          # Graph integrity checking
└── apps/
    └── web/                 # Next.js 15 web application
        ├── app/
        │   ├── page.tsx     # Home page with document ingestion
        │   ├── graph/       # Interactive graph visualization with filtering
        │   ├── dashboard/   # Clickable analytics and AI Q&A
        │   └── api/         # Backend API routes
        └── components/      # React components (shadcn/ui)
```

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build Backend Packages

```bash
pnpm build
```

### 3. Configure Environment Variables

```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local` and add:

```bash
# Required: Anthropic API Key for Claude
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required: Neon Postgres Database URL
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

To set up your Neon database:
1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the Neon dashboard
4. Paste it as your `DATABASE_URL` in `.env.local`

### 4. Run the Web App

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Building Packages

To build all backend packages:

```bash
pnpm build
```

To build a specific package:

```bash
pnpm --filter @defense/graph-store build
pnpm --filter @defense/ingestion build
pnpm --filter @defense/analyst build
```

## Usage Examples

### Document Ingestion

```typescript
import { TripleExtractor } from '@defense/ingestion';
import { PostgresGraph } from '@defense/graph-store';

const extractor = new TripleExtractor(process.env.ANTHROPIC_API_KEY);
const graph = new PostgresGraph(process.env.DATABASE_URL);

// Extract from defense text
const text = "Raytheon Technologies provides the AN/SPY-6 radar for DDG-51 Flight III destroyers.";
const result = await extractor.extractTriples(text);

// Add to persistent graph (stored in Postgres)
await graph.addDocument({
  title: "AN/SPY-6 Information",
  content: text,
  source: "Defense News",
  triples: result.triples
});
```

### AI Q&A

```typescript
import { DefenseAnalyst } from '@defense/analyst';

const analyst = new DefenseAnalyst(process.env.ANTHROPIC_API_KEY);

const response = await analyst.answerQuestion(
  "What radar is used on DDG-51 destroyers?",
  graph
);

console.log(response.analysis);
console.log(response.key_findings);
console.log(response.evidence);
```

### Validation

```typescript
import { validateGraph } from '@defense/validation';

const report = await validateGraph(graph);

console.log(`Total entities: ${report.validation_results.total_entities}`);
console.log(`Total relations: ${report.validation_results.total_relations}`);
console.log(`Orphan nodes: ${report.validation_results.orphan_nodes.length}`);
console.log('Recommendations:', report.recommendations);
```

## Web Application Usage

### Home Page (Document Ingestion)

Navigate to `/` to:
- Paste defense documents in the text area
- Click "Process Document" to extract entities and relationships
- View extracted triples with confidence scores
- Data is automatically saved to Neon Postgres

### Graph Visualization

Navigate to `/graph` to:
- View an interactive visualization of the knowledge graph
- **Filter** by entity type (Program, Contractor, System, etc.)
- **Search** for specific entities by name
- **Focus** on individual nodes and their connections
- **Navigate** via interactive minimap (pan and zoom)
- **Deep link** from dashboard analytics by clicking entity names
- **Collapsible controls** to maximize graph viewing area
- **"Back to Full View"** button to reset filters and focus

### Dashboard

Navigate to `/dashboard` to:
- View **Contractor Portfolios** with system counts (all clickable → navigates to graph)
- Explore **System Hierarchies** showing Program → System → Subsystem relationships (all clickable)
- See **Entity Type Distribution** and **Relationship Type Distribution**
- **Ask Intelligence Questions** with AI-powered Q&A over the knowledge graph
- Animated loading states show progress through entity extraction, graph traversal, and Claude analysis

## Sample Data

A comprehensive test document is provided in [`test-ingestion-sample.txt`](test-ingestion-sample.txt) covering:
- NGAD (Next Generation Air Dominance) program
- B-21 Raider stealth bomber
- F-35 Block 4 modernization
- Collaborative Combat Aircraft (CCA)
- Hypersonic weapons (AGM-183A ARRW)
- MQ-25 Stingray refueling drone

Try pasting this into the Home page to test the ingestion pipeline!

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Graph Visualization**: React Flow with interactive minimap and dagre layout
- **Database**: Neon Postgres (serverless) with Drizzle ORM
- **AI Integration**: Anthropic Claude (Haiku 4.5 for extraction, Sonnet 3.7 for analysis)
- **Backend**: TypeScript packages with Zod schemas
- **Monorepo**: pnpm workspaces + Turbo

## Schema

The system uses a strict schema defined in `@defense/schema`:

**Entity Types**: Program, System, Subsystem, Technology, Capability, Contractor, GovernmentOffice, PEO, and more

**Relation Types**: part_of, overseen_by, developed_by, funded_by, depends_on, interfaces_with, etc.

**Confidence Scores**: All relationships require confidence between 0.5 and 1.0

See [`CLAUDE.md`](CLAUDE.md) for complete specification.

## Development

```bash
# Run tests
pnpm test

# Build all packages
pnpm build

# Run specific package tests
pnpm --filter @defense/schema test

# Start development server
pnpm dev
```

## License

MIT
