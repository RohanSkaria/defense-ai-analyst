# Defense AI Analyst

A **Defense Knowledge Graph + AI Analyst Agent** for processing and analyzing defense-related information with an interactive web interface.

## Features

- **Ingestion Mode**: Extract entities and relationships from defense documents into a knowledge graph
- **Analyst Mode**: Answer questions using structured reasoning over the knowledge graph
- **Validation Mode**: Check graph integrity and identify issues
- **Interactive Graph Visualization**: Explore the knowledge graph with React Flow
- **Real-time Chat Interface**: Multi-mode chat powered by Vercel AI SDK
- **Dashboard Analytics**: View metrics and validation reports

## Architecture

```
defense-ai-analyst/
├── packages/                # Backend packages
│   ├── schema/              # Zod schemas for entities, relations, and triples
│   ├── graph-store/         # In-memory graph database (graphology)
│   ├── ingestion/           # LLM-based entity/relation extraction
│   ├── analyst/             # Question answering engine
│   └── validation/          # Graph integrity checking
└── apps/
    └── web/                 # Next.js 15 web application
        ├── app/
        │   ├── chat/        # Multi-mode chat interface
        │   ├── graph/       # Interactive graph visualization
        │   ├── dashboard/   # Analytics and metrics
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
# Edit .env.local and add your ANTHROPIC_API_KEY
```

### 4. Run the Web App

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @defense/schema test
pnpm --filter @defense/graph-store test
pnpm --filter @defense/ingestion test
pnpm --filter @defense/analyst test
pnpm --filter @defense/validation test

# Build all packages
pnpm build
```

## Integration Tests

Integration tests with real LLM calls require an Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your_key_here
pnpm vitest run
```

Without an API key, the LLM-dependent tests will be skipped, but mocked tests will run.

## Usage Examples

### Ingestion Mode

```typescript
import { TripleExtractor } from '@defense/ingestion';
import { GraphStore } from '@defense/graph-store';

const extractor = new TripleExtractor(process.env.ANTHROPIC_API_KEY);
const graph = new GraphStore();

// Extract from defense text
const text = "Raytheon Technologies provides the AN/SPY-6 radar for DDG-51 Flight III destroyers.";
const result = await extractor.extractTriples(text);

// Add to graph
result.triples.forEach((triple) => {
  graph.addNode(triple.a, triple.type_a);
  graph.addNode(triple.b, triple.type_b);
  graph.addEdge(triple.a, triple.b, triple.relation, triple.confidence);
});
```

### Analyst Mode

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

### Validation Mode

```typescript
import { validateGraph } from '@defense/validation';

const report = validateGraph(graph);

console.log(`Total entities: ${report.validation_results.total_entities}`);
console.log(`Total relations: ${report.validation_results.total_relations}`);
console.log(`Orphan nodes: ${report.validation_results.orphan_nodes.length}`);
console.log('Recommendations:', report.recommendations);
```

## Web Application Usage

### Chat Interface

Navigate to `/chat` to access the multi-mode chat interface:

1. **Chat Mode** (💬): General conversation about defense topics
2. **Ingest Mode** (📥): Paste defense documents to extract entities and relations
3. **Analyze Mode** (🔍): Ask questions about the knowledge graph
4. **Validate Mode** (✅): Check graph integrity and get recommendations

### Graph Visualization

Navigate to `/graph` to:
- View an interactive visualization of the knowledge graph
- Pan, zoom, and explore entity relationships
- See entity types color-coded
- Click nodes to view details

### Dashboard

Navigate to `/dashboard` to:
- View total entities and relations count
- See orphan node statistics
- Get validation recommendations
- Monitor graph health

## Sample Data

Example defense documents are provided in [`examples/defense-samples/`](examples/defense-samples/):
- `raytheon-spy6.txt` - AN/SPY-6 radar system
- `golden-dome.txt` - Golden Dome hypersonic defense program

Try pasting these into the Chat → Ingest mode!

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Graph Visualization**: React Flow
- **Data Tables**: TanStack Table
- **AI Integration**: Vercel AI SDK + Anthropic Claude
- **Backend**: TypeScript packages (graphology, Zod)
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
