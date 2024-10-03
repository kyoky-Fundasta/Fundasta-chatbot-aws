import json
import boto3
import os
import uuid
import logging
from base64 import b64decode
from botocore.exceptions import ClientError


# Function to decrypt environment variables
def decrypt_env_var(env_var_name):
    encrypted = os.environ[env_var_name]
    decrypted = (
        boto3.client("kms")
        .decrypt(
            CiphertextBlob=b64decode(encrypted),
            EncryptionContext={
                "LambdaFunctionName": os.environ["AWS_LAMBDA_FUNCTION_NAME"]
            },
        )["Plaintext"]
        .decode("utf-8")
    )
    return decrypted


class S3Handler(logging.Handler):
    def __init__(self, bucket_name, object_key):
        logging.Handler.__init__(self)
        self.s3_client = boto3.client("s3")
        self.bucket_name = bucket_name
        self.object_key = object_key
        self._logging_error = False  # Flag to prevent recursive logging

    def emit(self, record):
        if self._logging_error:
            return  # Prevent recursive logging

        try:
            # Read existing log data
            try:
                response = self.s3_client.get_object(
                    Bucket=self.bucket_name, Key=self.object_key
                )
                existing_log_data = response["Body"].read().decode("utf-8")
            except ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    existing_log_data = ""
                else:
                    raise

            # Append new log data
            log_entry = self.format(record)
            updated_log_data = existing_log_data + log_entry + "\n"

            # Write back to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name, Key=self.object_key, Body=updated_log_data
            )
        except Exception as e:
            self._logging_error = True
            logger.error(f"Failed to upload log to S3: {e}")
            self._logging_error = False


# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# s3_handler = S3Handler("fundasta-chatbot-mainlambda", "logger_messages.txt")
# formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
# s3_handler.setFormatter(formatter)
# logger.addHandler(s3_handler)

# # Test log entry to verify S3 logging
# logger.info("Logger initialized and ready to log messages.")

# Access environment variables
agent_id = decrypt_env_var("agent_id")
agent_alias_id = decrypt_env_var("agent_alias_id")
endpoint_url = decrypt_env_var("WEBSOCKET_API_ENDPOINT")

bedrock_agent_runtime = boto3.client(
    "bedrock-agent-runtime", region_name="ap-northeast-1"
)

# Initialize API Gateway management client
api_gateway_management = boto3.client(
    "apigatewaymanagementapi",
    endpoint_url="https://hdo2jjkkf0.execute-api.ap-northeast-1.amazonaws.com/dev",
)


def lambda_handler(event, context):
    response = None
    try:
        # logger.info(f"Received event: {json.dumps(event)}")

        # Extract connection ID and user input from the WebSocket event
        connection_id = event["requestContext"]["connectionId"]
        body = json.loads(event.get("body", "{}"))
        user_input = body.get("input", "")

        # logger.info(f"User input: {user_input}")

        if not user_input:
            send_message(connection_id, json.dumps({"error": "No input provided"}))
            response = {"statusCode": 400}
        else:
            # logger.info("Invoking Bedrock agent")
            response = bedrock_agent_runtime.invoke_agent(
                agentId=agent_id,
                agentAliasId=agent_alias_id,
                sessionId=str(uuid.uuid4()),
                inputText=user_input,
                enableTrace=True,
            )
            # logger.info("Bedrock agent invoked successfully")

            for event in response["completion"]:
                if "chunk" in event:
                    chunk = event["chunk"]["bytes"].decode()
                    # logger.info(f"Received chunk: {chunk}")
                    send_message(connection_id, json.dumps({"chunk": chunk}))

            send_message(connection_id, json.dumps({"chunk": "[DONE]"}))
            response = {"statusCode": 200}

    except Exception as e:
        # logger.error(f"An error occurred: {str(e)}", exc_info=True)
        send_message(
            connection_id,
            json.dumps({"error": f"An internal error occurred: {str(e)}"}),
        )
        response = {"statusCode": 500}

    return response


def send_message(connection_id, message):
    if not message or not message.strip():
        # logger.warning(f"Attempted to send empty message to {connection_id}, skipping")
        return

    try:
        api_gateway_management.post_to_connection(
            ConnectionId=connection_id, Data=message.encode("utf-8")
        )
    except ClientError as e:
        # logger.error(f"Error sending message: {str(e)}")
        if e.response["Error"]["Code"] == "GoneException":
            logger.error(f"Connection ID {connection_id} is no longer valid.")
        elif e.response["Error"]["Code"] == "BadRequestException":
            logger.error(f"Invalid connection ID: {connection_id}")
        else:
            logger.error(f"Unexpected error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error sending message: {str(e)}")
