# Shares the S3 state bucket created for sports-scores; state is isolated by key.
terraform {
  backend "s3" {
    bucket       = "sports-scores-tfstate-228897118541"
    key          = "food-journal/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
