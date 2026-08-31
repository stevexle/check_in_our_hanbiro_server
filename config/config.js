require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    schema: process.env.DB_SCHEMA || "hanbiro",
    searchPath: process.env.DB_SCHEMA || "hanbiro",
    dialectOptions: {
      prependSearchPath: true,
    },
    define: {
      schema: process.env.DB_SCHEMA || "hanbiro",
    },
    migrationStorageTableName: "SequelizeMeta",
    migrationStorageTableSchema: process.env.DB_SCHEMA || "hanbiro",
  },
  test: {
    username: "root",
    password: null,
    database: "database_test",
    host: "127.0.0.1",
    port: 5432,
    dialect: "postgres",
    schema: "hanbiro",
    searchPath: "hanbiro",
    dialectOptions: {
      prependSearchPath: true,
    },
    define: {
      schema: "hanbiro",
    },
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    schema: process.env.DB_SCHEMA || "hanbiro",
    searchPath: process.env.DB_SCHEMA || "hanbiro",
    dialectOptions: {
      prependSearchPath: true,
    },
    define: {
      schema: process.env.DB_SCHEMA || "hanbiro",
    },
    migrationStorageTableName: "SequelizeMeta",
    migrationStorageTableSchema: process.env.DB_SCHEMA || "hanbiro",
  },
};

