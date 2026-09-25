"use strict";

const swaggerJSDoc = require("swagger-jsdoc");

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Express todo API",
      version: "1.0.0",
    },
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            username: { type: "string" },
          },
        },
        SignUpRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: {
              type: "string",
              minLength: 3,
              maxLength: 30,
              pattern: "^[a-zA-Z0-9_]{3,30}$",
            },
            password: { type: "string", minLength: 6 },
          },
        },
      },
      responses: {
        BadRequest: { description: "Missing or invalid request data." },
        Conflict: { description: "Resource already exists." },
        Unauthorized: { description: "Missing or invalid credentials." },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  },
  // resolved relative to process.cwd(), so this works regardless of which file requires it
  apis: ["./routes/*.js", "./docs/paths/*.yaml"]
});

module.exports = swaggerSpec;
