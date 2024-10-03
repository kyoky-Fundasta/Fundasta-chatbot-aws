import json
from lambda_function import lambda_handler
from aws_lambda_powertools.utilities.typing import LambdaContext


# Create a mock Lambda context
class MockContext(LambdaContext):
    function_name: str = "test-function"
    function_version: str = "$LATEST"
    invoked_function_arn: str = (
        "arn:aws:lambda:ap-northeast-1:294923484056:function:test-function"
    )
    memory_limit_in_mb: int = 128
    aws_request_id: str = "da658bd3-2d6f-4e7b-8ec2-937234644fdc"
    log_group_name: str = "/aws/lambda/bedrock-agent-fundasta/test-function"
    log_stream_name: str = "2022/03/24/[$LATEST]ab1234567890"


# Mock event and context
event = {
    "body": json.dumps(
        {"input": "FundastAの入社2年目の社員は有給休暇を何日取得できますか"}
    ),
    "requestContext": {
        "domainName": "example.execute-api.us-east-1.amazonaws.com",
        "stage": "prod",
        "connectionId": "example-connection-id",
    },
}

# event = {"body": json.dumps({"input": "Tell me a joke"})}
context = MockContext()


# Mock api-gateway
def mock_api_gateway_event(response):
    for event in response["completion"]:
        if "chunk" in event:
            chunk = event["chunk"]["bytes"].decode()
            yield chunk
    yield "EOS"
