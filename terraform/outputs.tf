output "app_policy_arn" {
  value = aws_iam_policy.app.arn
}

output "vercel_role_arn" {
  description = "Set this as AWS_ROLE_ARN in the Vercel project env vars"
  value       = aws_iam_role.vercel_app.arn
}

output "github_actions_role_arn" {
  description = "Role assumed by the Terraform GitHub Actions workflow"
  value       = aws_iam_role.github_actions_terraform.arn
}
