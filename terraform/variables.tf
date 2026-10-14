variable "aws_region" {
  description = "AWS region for Bedrock"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Local AWS CLI profile used to run Terraform (leave empty to use env credentials, e.g. in CI)"
  type        = string
  default     = ""
}

variable "vercel_team_slug" {
  description = "Vercel team slug (issuer/audience/subject of the OIDC token)"
  type        = string
  default     = "waynefolkes-projects"
}

variable "vercel_project_name" {
  description = "Vercel project allowed to assume the app role"
  type        = string
  default     = "food_journal"
}

variable "github_repo" {
  description = "GitHub repository (owner/name) allowed to assume the Terraform role"
  type        = string
  default     = "wayne-folkes/food_journal"
}

variable "state_bucket" {
  description = "S3 bucket holding Terraform state (must match backend.tf)"
  type        = string
  default     = "sports-scores-tfstate-228897118541"
}

variable "budget_email" {
  description = "Email notified at 80% / 100% of the Bedrock budget and when the cutoff action fires"
  type        = string
  default     = "wayne.folkes@gmail.com"
}

variable "bedrock_budget_usd" {
  description = "Monthly Bedrock spend at which the kill-switch denies the app role"
  type        = number
  default     = 5
}

variable "bedrock_model_ids" {
  description = "Bedrock model IDs the app may invoke (keep in sync with CALORIE_AI_MODEL)"
  type        = list(string)
  default     = ["zai.glm-5"]
}
