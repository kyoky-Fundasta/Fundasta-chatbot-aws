# Chatbot Lambda Function

This Lambda function implements the backend logic for the chatbot.

## Dependencies

- boto3
- aws-lambda-powertools

## Deployment

To deploy this Lambda function:

1. Install the dependencies:
   ```bash
   pip install -r requirements.txt -t .
   ```

2. Zip the contents of this directory:
   ```bash
   zip -r ../lambda_function.zip .
   ```

3. Upload the zip file to AWS Lambda.

## Configuration

Ensure that the Lambda function has the necessary permissions to access Amazon Bedrock.