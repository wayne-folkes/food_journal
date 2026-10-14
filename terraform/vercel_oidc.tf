locals {
  vercel_issuer = "oidc.vercel.com/${var.vercel_team_slug}"
}

# The OIDC provider is per Vercel *team*, and the sports-scores Terraform already
# creates it in this AWS account. Look it up rather than creating a duplicate
# (which would fail with EntityAlreadyExists).
data "aws_iam_openid_connect_provider" "vercel" {
  url = "https://${local.vercel_issuer}"
}

data "aws_iam_policy_document" "vercel_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.vercel.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.vercel_issuer}:aud"
      values   = ["https://vercel.com/${var.vercel_team_slug}"]
    }

    condition {
      test     = "StringLike"
      variable = "${local.vercel_issuer}:sub"
      values = [
        "owner:${var.vercel_team_slug}:project:${var.vercel_project_name}:environment:production",
        "owner:${var.vercel_team_slug}:project:${var.vercel_project_name}:environment:preview",
      ]
    }
  }
}

resource "aws_iam_role" "vercel_app" {
  name                 = "food-journal-vercel"
  description          = "Assumed by the food_journal Vercel project via OIDC"
  assume_role_policy   = data.aws_iam_policy_document.vercel_assume.json
  max_session_duration = 3600
}

resource "aws_iam_role_policy_attachment" "vercel_app" {
  role       = aws_iam_role.vercel_app.name
  policy_arn = aws_iam_policy.app.arn
}
