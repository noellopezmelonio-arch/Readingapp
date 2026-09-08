export interface InfoItem {
  id: string;
  key: string;
  value: string;
}

export interface Book {
  id: string;
  title: string;
  isRead: boolean;
  customInfo: InfoItem[];
  notes: string;
  author?: string;
  finishedDate?: string | null;
  pages?: number | null;
  genre?: string;
  publicationYear?: number | null;
  ownerId?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // stored as plain text for local development
}
