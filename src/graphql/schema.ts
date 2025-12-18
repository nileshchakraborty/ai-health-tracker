import gql from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  type User {
    id: ID!
    email: String!
    fullName: String!
    avatarUrl: String
    createdAt: DateTime!
    updatedAt: DateTime!
    healthData(range: DateRangeInput): [HealthData!]!
    goals: [HealthGoal!]!
    latestMetrics: LatestMetrics
  }

  type HealthData {
    id: ID!
    userId: String!
    source: HealthDataSource!
    type: HealthDataType!
    value: Float!
    unit: String!
    timestamp: DateTime!
    metadata: JSON
  }

  type HealthGoal {
    id: ID!
    userId: String!
    type: HealthDataType!
    target: Float!
    unit: String!
    createdAt: DateTime!
  }

  type LatestMetrics {
    steps: HealthData
    heartRate: HealthData
    sleepDuration: HealthData
    sleepQuality: HealthData
    hrv: HealthData
    readinessScore: HealthData
  }

  enum HealthDataSource {
    OURA_RING
    APPLE_HEALTH
    APPLE_WATCH
    MANUAL
  }

  enum HealthDataType {
    STEPS
    HEART_RATE
    SLEEP_DURATION
    SLEEP_QUALITY
    HRV
    CALORIES
    ACTIVITY_SCORE
    READINESS_SCORE
  }

  input DateRangeInput {
    start: DateTime!
    end: DateTime!
  }

  input CreateUserInput {
    email: String!
    fullName: String!
    avatarUrl: String
  }

  input SaveHealthDataInput {
    userId: String!
    source: HealthDataSource!
    type: HealthDataType!
    value: Float!
    unit: String!
    timestamp: DateTime!
    metadata: JSON
  }

  input CreateHealthGoalInput {
    userId: String!
    type: HealthDataType!
    target: Float!
    unit: String!
  }

  type Query {
    # User queries
    user(id: ID!): User
    userByEmail(email: String!): User

    # Health data queries
    healthData(userId: String!, range: DateRangeInput!): [HealthData!]!
    healthDataByType(userId: String!, type: HealthDataType!, range: DateRangeInput!): [HealthData!]!
    latestHealthData(userId: String!, type: HealthDataType!): HealthData

    # Goal queries
    healthGoals(userId: String!): [HealthGoal!]!

    # AI insights (cached, not streaming)
    aiInsights(userId: String!): String
  }

  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, fullName: String, avatarUrl: String): User

    # Health data mutations
    saveHealthData(input: SaveHealthDataInput!): HealthData!
    saveHealthDataBatch(inputs: [SaveHealthDataInput!]!): [HealthData!]!

    # Goal mutations
    createHealthGoal(input: CreateHealthGoalInput!): HealthGoal!
    deleteHealthGoal(id: ID!): Boolean!
  }

  scalar JSON
`;
