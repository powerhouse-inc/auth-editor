import { gql } from "graphql-tag";
import type { DocumentNode } from "graphql";

export const schema: DocumentNode = gql`
  type WhoAmIResult {
    address: String!
    isAdmin: Boolean!
    isUser: Boolean!
    isGuest: Boolean!
  }

  type DocumentOperationInfo {
    name: String!
    module: String!
    scope: String!
  }

  type DocumentOperationsResult {
    documentId: String!
    documentType: String!
    operations: [DocumentOperationInfo!]!
  }

  type Query {
    whoami(address: String!): WhoAmIResult!
    documentOperations(documentId: String!): DocumentOperationsResult!
  }
`;
