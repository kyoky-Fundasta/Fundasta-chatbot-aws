import json
import boto3
from aws_lambda_powertools import Logger
import os
from dotenv import load_dotenv
import uuid
import asyncio

load_dotenv()

logger = Logger()
bedrock_agent_runtime = boto3.client(
    "bedrock-agent-runtime", region_name="ap-northeast-1"
)
agent_id = os.getenv("agent_id")
agent_alias_id = os.getenv("agent_alias_id")


# # API Gateway management client
# api_gateway_management = None

# def init_api_gateway_client(domain_name, stage):
#     global api_gateway_management
#     if api_gateway_management is None:
#         api_gateway_management = boto3.client('apigatewaymanagementapi', endpoint_url=f"https://{domain_name}/{stage}")
# async def send_response_chunk(connection_id, chunk):
#     try:
#         await api_gateway_management.post_to_connection(
#             ConnectionId=connection_id,
#             Data=json.dumps({"chunk": chunk})
#         )
#     except Exception as e:
#         logger.error(f"Failed to send chunk to client: {str(e)}")


# codes block for local testing
async def send_response_chunk(connection_id, chunk):
    try:
        await asyncio.sleep(0.1)
        print(chunk)
    except Exception as e:
        logger.error(f"Failed to send chunk to client: {str(e)}")


@logger.inject_lambda_context
def lambda_handler(event, context):

    try:

        connection_id = event["requestContext"][
            "connectionId"
        ]  # This line is for api gateway
        body = json.loads(event.get("body", "{}"))
        user_input = body.get("input", "")

        if not user_input:
            logger.warning("No input provided")
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "No input provided"}),
            }

        print(f"Invoking Bedrock model with input: {user_input}")

        # Generate a unique request ID
        request_id = str(uuid.uuid4())
        response = bedrock_agent_runtime.invoke_agent(
            agentId=agent_id,
            agentAliasId=agent_alias_id,
            sessionId=request_id,
            inputText=user_input,
        )

        print("Bedrock model invoked successfully")

        # API Gateway connection
        loop = asyncio.get_event_loop()

        async def process_response():
            for event in response["completion"]:
                if "chunk" in event:
                    chunk = event["chunk"]["bytes"].decode()
                    await send_response_chunk(connection_id, chunk)

            await send_response_chunk(connection_id, "EOS")

        loop.run_until_complete(process_response())
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Streaming completed"}),
        }

        tool_outputs = response.get("actionOutputs", [])
        for tool_output in tool_outputs:
            logger.info(f"Tool used: {tool_output['actionName']}")
            logger.info(f"Tool output: {tool_output['output']}")

        logger.info(f"Generated response for input: {user_input}")

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        logger.exception(f"An error occurred: {str(e)}")
        response = {
            "statusCode": 500,
            "body": json.dumps({"error": f"An internal error occurred: {str(e)}"}),
        }

    return response


if __name__ == "__main__":
    from test_lambda import event, context

    response = lambda_handler(event, context)
    print(response)
