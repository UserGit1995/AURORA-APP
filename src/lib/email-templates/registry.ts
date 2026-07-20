export interface TemplateEntry {
  component: React.FC<any>;
  subject: string | ((data: any) => string);
  displayName?: string;
  previewData?: Record<string, any>;
}

export const TEMPLATES: Record<string, TemplateEntry> = {};
