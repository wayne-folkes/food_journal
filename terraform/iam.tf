data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "app" {
  statement {
    sid = "InvokeCalorieEstimateModel"
    # The Converse API is authorised by the InvokeModel actions.
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
    ]
    resources = [for m in var.bedrock_model_ids : "arn:aws:bedrock:*::foundation-model/${m}"]
  }
}

resource "aws_iam_policy" "app" {
  name        = "food-journal-app"
  description = "Bedrock calorie-estimate access for food_journal"
  policy      = data.aws_iam_policy_document.app.json
}
