export const DynamoDbResources = {
  UserTable: {
    Type: 'AWS::DynamoDB::Table',
    Properties: {
      TableName: '${self:custom.prefix}-task',
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'N',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
      StreamSpecification: {
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
      TimeToLiveSpecification: {
        AttributeName: 'expire',
        Enabled: true,
      },
      // PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
      // ContributorInsightsSpecification: { Enabled: process.env.CONTRIBUTOR_INSIDE_ENABLED === 'YES' },
    },
  },
};
