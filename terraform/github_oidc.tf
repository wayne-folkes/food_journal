# The GitHub OIDC provider is account-wide and already exists (created for sports-scores).
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_actions_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:ref:refs/heads/main",
        "repo:${var.github_repo}:pull_request",
        "repo:${var.github_repo}:environment:Production",
      ]
    }
  }
}

resource "aws_iam_role" "github_actions_terraform" {
  name                 = "food-journal-github-actions-terraform"
  description          = "Assumed by GitHub Actions in ${var.github_repo} to plan/apply Terraform"
  assume_role_policy   = data.aws_iam_policy_document.github_actions_assume.json
  max_session_duration = 3600
}

# Scoped to manage exactly the resources this Terraform config declares, plus
# this project's state. Keep this in sync when new resource types are added.
data "aws_iam_policy_document" "github_actions_terraform" {
  statement {
    sid       = "StateObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${var.state_bucket}/food-journal/*"]
  }

  statement {
    sid       = "StateBucketList"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.state_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["food-journal/*"]
    }
  }

  statement {
    sid       = "AccountLookup"
    actions   = ["sts:GetCallerIdentity"]
    resources = ["*"]
  }

  statement {
    sid = "ManageIamRolesAndPolicies"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:UpdateRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:CreatePolicy",
      "iam:DeletePolicy",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:ListPolicyVersions",
      "iam:CreatePolicyVersion",
      "iam:DeletePolicyVersion",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:PutRolePolicy",
      "iam:GetRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListRoleTags",
      "iam:ListPolicyTags",
      "iam:PassRole",
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/food-journal-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/food-journal-*",
    ]
  }

  statement {
    sid = "ReadOidcProviders"
    actions = [
      "iam:GetOpenIDConnectProvider",
      "iam:ListOpenIDConnectProviders",
    ]
    resources = ["*"]
  }

  statement {
    sid = "ManageBudget"
    actions = [
      "budgets:ViewBudget",
      "budgets:ModifyBudget",
      "budgets:ListTagsForResource",
      "budgets:TagResource",
      "budgets:UntagResource",
      "budgets:CreateBudgetAction",
      "budgets:DescribeBudgetAction",
      "budgets:DescribeBudgetActionsForBudget",
      "budgets:UpdateBudgetAction",
      "budgets:DeleteBudgetAction",
      "budgets:ExecuteBudgetAction",
    ]
    resources = [
      "arn:aws:budgets::${data.aws_caller_identity.current.account_id}:budget/food-journal-*",
    ]
  }
}

resource "aws_iam_policy" "github_actions_terraform" {
  name        = "food-journal-github-actions-terraform"
  description = "Permissions for GitHub Actions to plan/apply the food_journal Terraform config"
  policy      = data.aws_iam_policy_document.github_actions_terraform.json
}

resource "aws_iam_role_policy_attachment" "github_actions_terraform" {
  role       = aws_iam_role.github_actions_terraform.name
  policy_arn = aws_iam_policy.github_actions_terraform.arn
}
