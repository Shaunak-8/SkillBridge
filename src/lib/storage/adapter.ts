import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface StorageAdapter {
  uploadFile(file: File, path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
  private baseDir = join(process.cwd(), 'public', 'uploads');

  async uploadFile(file: File, directory: string): Promise<string> {
    await mkdir(join(this.baseDir, directory), { recursive: true });
    
    const ext = file.name.split('.').pop();
    const fileName = `${randomUUID()}.${ext}`;
    const filePath = join(this.baseDir, directory, fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await writeFile(filePath, buffer);
    
    return `/uploads/${directory}/${fileName}`;
  }

  async deleteFile(url: string): Promise<void> {
    // Basic implementation for local storage
    // Not critical for prototype, but should unlink the file
  }
}

// In a real application, we'd use process.env.STORAGE_PROVIDER to switch
export const storage: StorageAdapter = new LocalStorageAdapter();
