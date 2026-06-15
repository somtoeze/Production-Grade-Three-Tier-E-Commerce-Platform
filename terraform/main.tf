# main.tf - Complete infrastructure for e-commerce platform

terraform {
  required_version = ">= 1.5"
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "ecommerce/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC with public and private subnets across 3 AZs
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr             = "10.0.0.0/16"
  environment          = var.environment
  availability_zones   = 3
  
  public_subnets       = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets      = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
  database_subnets     = ["10.0.100.0/24", "10.0.101.0/24", "10.0.102.0/24"]
}

# RDS PostgreSQL (Multi-AZ for production)
module "rds" {
  source = "./modules/rds"
  
  db_name         = "ecommerce"
  db_username     = var.db_username
  db_password     = var.db_password
  instance_class  = var.environment == "prod" ? "db.t3.large" : "db.t3.micro"
  multi_az        = var.environment == "prod"
  storage_gb      = var.environment == "prod" ? 100 : 20
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.database_subnets
  
  backup_retention_days = var.environment == "prod" ? 30 : 7
}

# ElastiCache Redis cluster
module "redis" {
  source = "./modules/redis"
  
  cluster_name    = "ecommerce-cache"
  node_type       = var.environment == "prod" ? "cache.t3.medium" : "cache.t3.micro"
  num_cache_nodes = var.environment == "prod" ? 2 : 1
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
}

# ECS Fargate cluster
module "ecs" {
  source = "./modules/ecs"
  
  cluster_name = "ecommerce-cluster"
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnets
  
  backend_service = {
    name          = "backend-api"
    cpu           = 512
    memory        = 1024
    desired_count = var.environment == "prod" ? 3 : 1
    image         = "${aws_ecr_repository.backend.repository_url}:latest"
    port          = 8000
    environment_variables = {
      DATABASE_URL = module.rds.connection_url
      REDIS_URL    = module.redis.connection_url
    }
  }
  
  frontend_service = {
    name          = "frontend"
    cpu           = 256
    memory        = 512
    desired_count = var.environment == "prod" ? 2 : 1
    image         = "${aws_ecr_repository.frontend.repository_url}:latest"
    port          = 3000
  }
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  name       = "ecommerce-alb"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets
  
  listeners = {
    http = {
      port     = 80
      protocol = "HTTP"
      redirect = {
        port        = 443
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
    https = {
      port            = 443
      protocol        = "HTTPS"
      certificate_arn = var.certificate_arn
      default_action  = {
        type             = "forward"
        target_group_arn = module.ecs.backend_target_group_arn
      }
    }
  }
}

# CloudFront CDN for static assets
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = module.alb.alb_dns_name
    origin_id   = "ecommerce-origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ecommerce-origin"
    
    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  tags = {
    Environment = var.environment
    Project     = "ecommerce-platform"
  }
}