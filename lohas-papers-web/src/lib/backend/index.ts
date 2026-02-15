// Barrel export for backend modules
export { handleSearch } from "./search-handler";
export {
  handlePaperDetail,
  handlePaperSummary,
  handleFulltext,
  handleBatchSummary,
} from "./paper-handler";
export type { LLMConfig } from "./llm-client";
export type {
  SearchRequest,
  SearchResponse,
  PaperDetailResponse,
  PaperSummaryResponse,
  FulltextTranslationResponse,
} from "./types";
