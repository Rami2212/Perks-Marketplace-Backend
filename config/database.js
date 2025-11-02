const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null; // Cached connection
  }

  async connect() {
    // In serverless environments, reuse existing connections
    if (this.connection && mongoose.connection.readyState === 1) {
      return this.connection;
    }

    try {
      const mongoUri =
        process.env.NODE_ENV === 'test'
          ? process.env.MONGODB_TEST_URI
          : process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error('MONGODB_URI not set');
      }

      // Optimized options for serverless/Vercel
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
        bufferMaxEntries: 0, // Disable mongoose buffering
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
      };

      // Only create new connection if one doesn't exist
      if (mongoose.connection.readyState === 0) {
        this.connection = await mongoose.connect(mongoUri, options);
        console.log(`MongoDB Connected: ${this.connection.connection.host}`);
      } else {
        this.connection = mongoose;
      }

      // Event listeners for connection monitoring
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.connection = null;
      });

      // Graceful handling for serverless cold starts
      mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
      });

      return this.connection;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      this.connection = null;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (!this.connection) return;
      
      // In serverless environments, we typically don't manually disconnect
      // Let the function timeout handle cleanup
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        console.log('Serverless environment detected, skipping manual disconnect');
        return;
      }

      await mongoose.connection.close();
      this.connection = null;
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }

  getConnection() {
    return this.connection;
  }

  async isHealthy() {
    try {
      // Check if mongoose is connected
      const state = mongoose.connection.readyState;
      return state === 1; // 1 = connected
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Method to ensure connection is established
  async ensureConnection() {
    if (mongoose.connection.readyState !== 1) {
      await this.connect();
    }
    return this.connection;
  }
}

module.exports = new Database();