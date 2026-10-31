export type EmbeddableLanguage = {
  id: string | number;
  name: string;
  version: string;
};

export type ProblemFunction = {
  id: string | number;
  fn: string;
  lid: string | number;
};

export type EmbeddableProblem = {
  id: string | number;
  title: string;
  desc: string;
  time: number;
  memory: number;
  langs: EmbeddableLanguage[];
  func: Record<string, ProblemFunction>;
};

export type EmbeddableApiError = {
  message?: string;
  detail?: string;
};