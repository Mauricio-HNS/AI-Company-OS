# Memory Capability

The Memory capability provides generic evidence-backed knowledge lifecycle mechanics shared across AI Company OS components.

It owns:
- memory record contracts
- active, superseded and contested lifecycle states
- memory creation
- supersession and contestation
- expiration handling

Company-specific memory storage, ingestion and Brain behavior remain outside this capability. The existing `lib/company-memory.ts` remains as a compatibility adapter so product code can migrate incrementally without duplicating the implementation.
