
export enum Category {
  ALL = 'Все',
  ROLES = 'Ролевые модели',
  TEXT = 'Работа с текстом',
  IDEAS = 'Генерация идей',
  TECHNICAL = 'Технические / Код',
  VISUAL = 'Визуал / Изображения'
}

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
  defaultComponents: string[]; // Список названий полей по умолчанию (Context, Objective...)
}

export interface Prompt {
  id: string;
  title: string;
  category: Category;
  tags: string[];
  
  // Новая структура контента
  systemContent: string;
  userContent: string;
  
  description: string;
  modelRecommendation: string;
  exampleOutput?: string;
  notes?: string;
  
  // Связь со структурой
  structureId?: string;
  components: PromptComponent[];
}
