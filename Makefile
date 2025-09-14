# === Configuration ===
SHELL := /bin/bash
.DEFAULT_GOAL := help
.PHONY: help install build test clean dev
.PHONY: clean-build rebuild
.PHONY: test test-unit test-integration test-coverage test-watch test-ci
.PHONY: docker-build docker-run docker-stop docker-clean docker-push docker-logs docker-shell
.PHONY: deploy-staging deploy-prod rollback ecr-login ecs-status ecs-logs

# Environment configuration
ENVIRONMENT ?= development
AWS_REGION ?= us-west-2
AWS_ACCOUNT_ID ?= 183041336732
AWS_ACCOUNT_ID_PRODUCTION ?= 150429528800
IMAGE_NAME := lab-assistant-frontend
TIMESTAMP := $(shell date +%Y%m%d-%H%M%S)
IMAGE_TAG ?= $(ENVIRONMENT)-$(TIMESTAMP)

# ECR repository name includes environment suffix
ifeq ($(ENVIRONMENT),staging)
    ECR_REPOSITORY := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(IMAGE_NAME)-staging
    ECR_LOGIN_ACCOUNT_ID := $(AWS_ACCOUNT_ID)
else ifeq ($(ENVIRONMENT),production)
    ECR_REPOSITORY := $(AWS_ACCOUNT_ID_PRODUCTION).dkr.ecr.$(AWS_REGION).amazonaws.com/$(IMAGE_NAME)-production
    ECR_LOGIN_ACCOUNT_ID := $(AWS_ACCOUNT_ID_PRODUCTION)
else
    ECR_REPOSITORY := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(IMAGE_NAME)
    ECR_LOGIN_ACCOUNT_ID := $(AWS_ACCOUNT_ID)
endif

# === Help Target ===
help: ## Display available commands
	@echo "Lab Assistant Frontend - Makefile Commands"
	@echo "=========================================="
	@echo ""
	@echo "Essential Commands:"
	@grep -E '^(install|build|test|clean|dev):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "Build Management:"
	@grep -E '^(clean-build|rebuild):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "Testing:"
	@grep -E '^test-.*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "Docker:"
	@grep -E '^docker-.*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "Deployment:"
	@grep -E '^(deploy-|ecr-|ecs-|rollback).*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "Frontend-specific:"
	@grep -E '^(build-storybook|analyze-bundle|secrets-).*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# === Essential Targets ===
install: ## Install all dependencies
	npm ci

build: install clean-build ## Build application (includes install and clean-build)
	npm run build

test: ## Run all tests (includes clean-build where applicable)
	npm test

clean: ## Remove all build artifacts, caches, and temporary files
	rm -rf .next
	rm -rf node_modules
	rm -rf coverage
	rm -rf out
	rm -rf .turbo
	npm cache clean --force

dev: ## Start development server
	npm run dev

# === Build Management ===
clean-build: ## Remove build artifacts only
	rm -rf .next
	rm -rf out

rebuild: clean build ## Clean and build in one command

# === Testing Targets ===
test-unit: ## Run unit tests only
	npm test

test-integration: ## Run integration tests only
	@echo "Integration tests not configured yet"
	@exit 1

test-coverage: ## Run tests with coverage report
	npm run test:coverage

test-watch: ## Run tests in watch mode
	npm run test:watch

test-ci: ## Run tests in CI mode
	CI=true npm test -- --ci --coverage --maxWorkers=2

# === Docker Targets ===
docker-build: ## Build Docker image
	docker build --platform linux/amd64 -t $(IMAGE_NAME):$(IMAGE_TAG) .
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(IMAGE_NAME):latest

docker-run: ## Run container locally
	docker run --rm -p 3000:3000 \
		-e NODE_ENV=$(ENVIRONMENT) \
		--name $(IMAGE_NAME) \
		$(IMAGE_NAME):latest

docker-stop: ## Stop running containers
	docker stop $(IMAGE_NAME) || true

docker-clean: docker-stop ## Remove containers and images
	docker rm $(IMAGE_NAME) || true
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) || true
	docker rmi $(IMAGE_NAME):latest || true

docker-push: ecr-login ## Push image to registry
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(ECR_REPOSITORY):$(IMAGE_TAG)
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(ECR_REPOSITORY):latest
	docker push $(ECR_REPOSITORY):$(IMAGE_TAG)
	docker push $(ECR_REPOSITORY):latest
	@echo "Pushed image: $(ECR_REPOSITORY):$(IMAGE_TAG)"

docker-logs: ## Tail container logs
	docker logs -f $(IMAGE_NAME)

docker-shell: ## Open shell in running container
	docker exec -it $(IMAGE_NAME) /bin/sh

# === Deployment Targets ===
deploy-staging: ## Deploy to staging (includes build + push)
	@echo "Building and deploying to staging..."
	$(eval DEPLOY_TAG := staging-$(shell date +%Y%m%d-%H%M%S))
	$(MAKE) ENVIRONMENT=staging IMAGE_TAG=$(DEPLOY_TAG) build
	$(MAKE) ENVIRONMENT=staging IMAGE_TAG=$(DEPLOY_TAG) docker-build
	$(MAKE) ENVIRONMENT=staging IMAGE_TAG=$(DEPLOY_TAG) docker-push
	@echo "Updating ECS service..."
	aws ecs update-service \
		--cluster lab-assistant-frontend-staging-cluster \
		--service lab-assistant-frontend-staging-service \
		--force-new-deployment \
		--region $(AWS_REGION)
	@echo "Deployment to staging initiated. Check status with: make ecs-status ENVIRONMENT=staging"

deploy-prod: ## Deploy to production (includes build + push)
	@echo "Building and deploying to production..."
	$(eval DEPLOY_TAG := production-$(shell date +%Y%m%d-%H%M%S))
	$(MAKE) ENVIRONMENT=production IMAGE_TAG=$(DEPLOY_TAG) build
	$(MAKE) ENVIRONMENT=production IMAGE_TAG=$(DEPLOY_TAG) docker-build
	$(MAKE) ENVIRONMENT=production IMAGE_TAG=$(DEPLOY_TAG) docker-push
	@echo "Updating ECS service..."
	aws ecs update-service \
		--cluster lab-assistant-frontend-production-cluster \
		--service lab-assistant-frontend-production-service \
		--force-new-deployment \
		--region $(AWS_REGION)
	@echo "Deployment to production initiated. Check status with: make ecs-status ENVIRONMENT=production"

rollback: ## Rollback to previous deployment
	@echo "Rolling back ECS service..."
	aws ecs update-service \
		--cluster lab-assistant-frontend-$(ENVIRONMENT)-cluster \
		--service lab-assistant-frontend-$(ENVIRONMENT)-service \
		--force-new-deployment \
		--region $(AWS_REGION)

# === AWS/Infrastructure Targets ===
ecr-login: ## Authenticate with ECR
	aws ecr get-login-password --region $(AWS_REGION) | \
		docker login --username AWS --password-stdin $(ECR_LOGIN_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com

ecs-status: ## Check ECS deployment status
	aws ecs describe-services \
		--cluster lab-assistant-frontend-$(ENVIRONMENT)-cluster \
		--services lab-assistant-frontend-$(ENVIRONMENT)-service \
		--region $(AWS_REGION) \
		--query 'services[0].deployments[*].[status,taskDefinition,desiredCount,runningCount]' \
		--output table

ecs-logs: ## Tail ECS logs
	aws logs tail /ecs/$(IMAGE_NAME)-$(ENVIRONMENT) \
		--follow \
		--region $(AWS_REGION)

# === Frontend-specific Targets ===
build-storybook: ## Build Storybook for component documentation
	@echo "Storybook not configured yet"
	@exit 1

analyze-bundle: ## Analyze webpack bundle size
	@echo "Bundle analyzer not configured yet"
	@exit 1

secrets-dev: ## Load development secrets
	npm run secrets:dev

secrets-staging: ## Load staging secrets
	npm run secrets:staging

secrets-production: ## Load production secrets
	npm run secrets:production