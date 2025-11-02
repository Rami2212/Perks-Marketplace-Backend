const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.client = null;       // MongoClient instance
    this.db = null;           // Cached database connection
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    if (this.db) {
      // Reuse existing connection (important for serverless)
      return this.db;
    }

    try {
      const mongoUri =
        process.env.NODE_ENV === 'test'
          ? process.env.MONGODB_TEST_URI
          : process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error('MONGODB_URI not set');
      }

      // Create a new MongoClient
      this.client = new MongoClient(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });

      // Connect
      await this.client.connect();

      // Cache the database (default: from URI)
      const dbName = process.env.MONGODB_DB || this.client.db().databaseName;
      this.db = this.client.db(dbName);

      console.log(`MongoDB Connected: ${mongoUri}`);

      // Event listeners
      this.client.on('close', () => console.log('MongoDB connection closed'));
      this.client.on('error', (err) => console.error('MongoDB error:', err));

      return this.db;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      throw error; // Let Vercel handle it
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (!this.client) return;
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }

  /**
   * Get current database instance
   */
  getConnection() {
    return this.db;
  }

  /**
   * Health check
   */
  async isHealthy() {
    try {
      if (!this.client) return false;
      // Ping the database
      await this.db.command({ ping: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new Database();
