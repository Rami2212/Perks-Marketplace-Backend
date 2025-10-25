const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

class FileUtils {
  // Check if file exists
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Get file stats
  async getFileStats(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      throw new Error(`Unable to get file stats: ${error.message}`);
    }
  }

  // Read file content
  async readFile(filePath, encoding = 'utf8') {
    try {
      return await fs.readFile(filePath, encoding);
    } catch (error) {
      throw new Error(`Unable to read file: ${error.message}`);
    }
  }

  // Write file content
  async writeFile(filePath, data, encoding = 'utf8') {
    try {
      // Ensure directory exists
      await this.ensureDirectory(path.dirname(filePath));
      return await fs.writeFile(filePath, data, encoding);
    } catch (error) {
      throw new Error(`Unable to write file: ${error.message}`);
    }
  }

  // Append to file
  async appendFile(filePath, data, encoding = 'utf8') {
    try {
      return await fs.appendFile(filePath, data, encoding);
    } catch (error) {
      throw new Error(`Unable to append to file: ${error.message}`);
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      if (await this.fileExists(filePath)) {
        await fs.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Unable to delete file: ${error.message}`);
    }
  }

  // Move/rename file
  async moveFile(oldPath, newPath) {
    try {
      await this.ensureDirectory(path.dirname(newPath));
      await fs.rename(oldPath, newPath);
    } catch (error) {
      throw new Error(`Unable to move file: ${error.message}`);
    }
  }

  // Copy file
  async copyFile(sourcePath, destinationPath) {
    try {
      await this.ensureDirectory(path.dirname(destinationPath));
      await fs.copyFile(sourcePath, destinationPath);
    } catch (error) {
      throw new Error(`Unable to copy file: ${error.message}`);
    }
  }

  // Ensure directory exists
  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Unable to create directory: ${error.message}`);
    }
  }

  // List directory contents
  async listDirectory(dirPath) {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      throw new Error(`Unable to list directory: ${error.message}`);
    }
  }

  // Get file extension
  getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  // Get filename without extension
  getFileNameWithoutExtension(filename) {
    return path.basename(filename, path.extname(filename));
  }

  // Generate unique filename
  generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = this.getFileExtension(originalName);
    const nameWithoutExt = this.getFileNameWithoutExtension(originalName);
    
    return `${nameWithoutExt}-${timestamp}-${random}${ext}`;
  }

  // Generate file hash
  async generateFileHash(filePath, algorithm = 'sha256') {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash(algorithm);
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Unable to generate file hash: ${error.message}`);
    }
  }

  // Get file MIME type
  getMimeType(filename) {
    const ext = this.getFileExtension(filename);
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Validate file type
  isValidFileType(filename, allowedTypes = []) {
    const mimeType = this.getMimeType(filename);
    return allowedTypes.length === 0 || allowedTypes.includes(mimeType);
  }

  // Check if file is an image
  isImageFile(filename) {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return imageTypes.includes(this.getMimeType(filename));
  }

  // Get image dimensions
  async getImageDimensions(filePath) {
    try {
      if (!this.isImageFile(filePath)) {
        throw new Error('File is not an image');
      }

      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      throw new Error(`Unable to get image dimensions: ${error.message}`);
    }
  }

  // Resize image
  async resizeImage(inputPath, outputPath, options = {}) {
    try {
      const {
        width,
        height,
        quality = 90,
        format = 'jpeg',
        fit = 'inside'
      } = options;

      let pipeline = sharp(inputPath);

      if (width || height) {
        pipeline = pipeline.resize(width, height, { fit, withoutEnlargement: true });
      }

      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality });
          break;
        case 'png':
          pipeline = pipeline.png({ quality });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        default:
          pipeline = pipeline.jpeg({ quality });
      }

      await this.ensureDirectory(path.dirname(outputPath));
      await pipeline.toFile(outputPath);

      return {
        path: outputPath,
        size: (await this.getFileStats(outputPath)).size
      };
    } catch (error) {
      throw new Error(`Unable to resize image: ${error.message}`);
    }
  }

  // Create thumbnail
  async createThumbnail(inputPath, outputPath, size = 150) {
    return this.resizeImage(inputPath, outputPath, {
      width: size,
      height: size,
      quality: 80,
      fit: 'cover'
    });
  }

  // Compress image
  async compressImage(inputPath, outputPath, quality = 80) {
    try {
      const format = this.getFileExtension(inputPath) === '.png' ? 'png' : 'jpeg';
      
      return this.resizeImage(inputPath, outputPath, {
        quality,
        format
      });
    } catch (error) {
      throw new Error(`Unable to compress image: ${error.message}`);
    }
  }

  // Clean up old files
  async cleanupOldFiles(directory, maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      const files = await this.listDirectory(directory);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await this.getFileStats(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await this.deleteFile(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      throw new Error(`Unable to cleanup old files: ${error.message}`);
    }
  }

  // Get directory size
  async getDirectorySize(dirPath) {
    try {
      const files = await this.listDirectory(dirPath);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await this.getFileStats(filePath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      throw new Error(`Unable to get directory size: ${error.message}`);
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Create secure file URL
  createSecureFileUrl(filePath, expiresIn = 3600) {
    const jwtUtils = require('./jwt');
    const token = jwtUtils.createSignedUrlToken(filePath, `${expiresIn}s`);
    return `/api/files/secure/${token}`;
  }

  // Validate file upload
  validateFileUpload(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = [],
      allowedExtensions = []
    } = options;

    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`);
    }

    // Check MIME type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const ext = this.getFileExtension(file.originalname);
      if (!allowedExtensions.includes(ext)) {
        errors.push(`File extension ${ext} is not allowed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create backup of file
  async createBackup(filePath, backupDir = './backups') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.basename(filePath);
      const backupFilename = `${timestamp}-${filename}`;
      const backupPath = path.join(backupDir, backupFilename);

      await this.copyFile(filePath, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Unable to create backup: ${error.message}`);
    }
  }
}

module.exports = new FileUtils();