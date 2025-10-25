const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.NODE_ENV === 'test' 
        ? process.env.MONGODB_TEST_URI 
        : process.env.MONGODB_URI;

      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferMaxEntries: 0, // Disable mongoose buffering
        bufferCommands: false, // Disable mongoose buffering
      };

      this.connection = await mongoose.connect(mongoUri, options);
      
      console.log(`MongoDB Connected: ${this.connection.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }

  getConnection() {
    return this.connection;
  }

  // Health check for database
  async isHealthy() {
    try {
      const state = mongoose.connection.readyState;
      return state === 1; // 1 = connected
    } catch (error) {
      return false;
    }
  }
}

module.exports = new Database();