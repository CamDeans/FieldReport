export interface TaxonomySector {
  id: string;
  label: string;
  description: string;
}

export interface TaxonomyIndustry {
  id: string;
  sectorId: string;
  label: string;
  description: string;
  /** Marketing / landing audience tags derived from this industry */
  audienceTags: string[];
}

export interface TaxonomyJobType {
  id: string;
  industryId: string;
  label: string;
  blurb: string;
  sections: string[];
  /** Terms that help match field notes to section headings */
  evidenceKeywords: string[];
  /** Terms that steer recommendation copy for this report type */
  recommendationHints: string[];
  /** Always available regardless of onboarding selections */
  universal?: boolean;
  /** Featured on landing page and onboarding defaults */
  featured?: boolean;
}

export interface TradePreferences {
  sectorIds: string[];
  industryIds: string[];
  defaultJobTypeId: string | null;
  onboardingCompletedAt: string | null;
}

export interface JobTypeGroup {
  industryId: string;
  industryLabel: string;
  sectorLabel: string;
  jobTypes: TaxonomyJobType[];
}
