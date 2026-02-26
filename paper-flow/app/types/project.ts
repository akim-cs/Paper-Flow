import type { Timestamp } from 'firebase/firestore';
import type { Slide, PresentationConfig } from './slides';

export interface Project {
  id: string;
  userId: string;
  name: string;
  extractedText: string;
  config: PresentationConfig;
  slides: Slide[];
  originalFileName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateProjectData {
  name: string;
  extractedText: string;
  config: PresentationConfig;
  slides: Slide[];
  originalFileName?: string;
}

export interface UpdateProjectData {
  name?: string;
  config?: PresentationConfig;
  slides?: Slide[];
}
