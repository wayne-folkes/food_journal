# NOTE: AWS Budgets can only filter Bedrock cost by service, so this counts
# *account-wide* Bedrock spend (including sports-scores), not just this app.
# It is a safety net, not per-app accounting.
resource "aws_budgets_budget" "bedrock" {
  name         = "food-journal-bedrock-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.bedrock_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Bedrock"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_email]
  }
}

# Attached to the app role by the budget action when spend crosses the cap.
resource "aws_iam_policy" "deny_bedrock" {
  name        = "food-journal-deny-bedrock"
  description = "Kill switch: blocks Bedrock invocation once the monthly budget is exhausted"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyBedrockInvoke"
      Effect   = "Deny"
      Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:Converse", "bedrock:ConverseStream"]
      Resource = "*"
    }]
  })
}

data "aws_iam_policy_document" "budgets_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "budgets_action" {
  name               = "food-journal-budget-action"
  assume_role_policy = data.aws_iam_policy_document.budgets_assume.json
}

resource "aws_iam_role_policy" "budgets_action" {
  name = "attach-detach-deny-policy"
  role = aws_iam_role.budgets_action.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListAttachedRolePolicies"]
      Resource = aws_iam_role.vercel_app.arn
    }]
  })
}

resource "aws_budgets_budget_action" "bedrock_cutoff" {
  budget_name        = aws_budgets_budget.bedrock.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budgets_action.arn

  action_threshold {
    action_threshold_type  = "ABSOLUTE_VALUE"
    action_threshold_value = var.bedrock_budget_usd
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.deny_bedrock.arn
      roles      = [aws_iam_role.vercel_app.name]
    }
  }

  subscriber {
    address           = var.budget_email
    subscription_type = "EMAIL"
  }
}
