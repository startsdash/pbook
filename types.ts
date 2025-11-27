
export type VerificationStatus = 'VERIFIED' | 'ON_REVIEW';
export type TargetType = 'SYSTEM' | 'USER';

export interface PromptComponent {
  id: string;
  label: string;
  value: string;
  target: TargetType;
}

export interface Structure {
  id: string;
  title: string;
  description?: string;
  defaultComponents: string[];
}

export interface Prompt {
  id: string;
  title: string;
  category: string; // Changed from Enum to string for dynamic categories
  tags: string[];
  
  systemContent: string;
  userContent: string;
  
  description: string;
  
  // New status field
  verificationStatus: VerificationStatus;
  
  // Removed: modelRecommendation, exampleOutput, notes
  
  structureId?: string;
  components: PromptComponent[];
}

// Templates share the exact same structure as Prompts
export type Template = Prompt;
