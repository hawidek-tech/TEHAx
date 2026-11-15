# 0008: Optional, replaceable AI help assistant

**Decision.**
- The assistant **always** returns approved help articles (`help_articles`, all five languages), so every task works with
  no AI at all. This is the non-AI alternative required by the spec.
- An AI answer is added only when (1) a provider is configured on the server (`ANTHROPIC_API_KEY`) and (2) the user
  ticks "Also ask the AI assistant" for that question. The key never reaches the browser.
- Provider interface `AssistantProvider`; current implementation `ClaudeAssistantProvider` (Anthropic Java SDK,
  model `claude-opus-5-5` via `ACCESSFLOW_AI_MODEL`, low effort for short answers, server-side refusal fallbacks enabled).
- Inputs are limited to the redacted question, non-personal context (flow and field ids, the visible question text,
  public job text) and the matching approved articles. Profile data is never sent.
- The system prompt forbids decisions about eligibility, ranking, disability inference, inventing requirements, and
  filling in or submitting anything; uncertainty leads to the human support route.

**Consequences.** Replacing the provider means implementing one interface. Without a key, the feature degrades to
approved help content and a human contact, which is tested.
