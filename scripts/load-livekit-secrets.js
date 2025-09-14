#!/usr/bin/env node

/**
 * Load LiveKit secrets with fallback priority:
 * 1. Local .livekit.secrets file (development)
 * 2. AWS Secrets Manager (staging/production)
 * 3. Fail with helpful error message
 *
 * Usage: node scripts/load-livekit-secrets.js [environment]
 */

const fs = require('fs')
const path = require('path')

// Try to load AWS SDK, but don't fail if not available
let SecretsManagerClient, GetSecretValueCommand
try {
	const awsSDK = require('@aws-sdk/client-secrets-manager')
	SecretsManagerClient = awsSDK.SecretsManagerClient
	GetSecretValueCommand = awsSDK.GetSecretValueCommand
} catch (error) {
	console.log('📦 AWS SDK not available - local file mode only')
}

function loadFromLocalFile() {
	const secretsPath = path.join(__dirname, '..', '.livekit.secrets')

	try {
		if (fs.existsSync(secretsPath)) {
			const secretsContent = fs.readFileSync(secretsPath, 'utf8')
			const secrets = JSON.parse(secretsContent)

			console.log(`✅ Loaded LiveKit credentials from local file`)
			console.log(`   - API Key: ${secrets.LIVEKIT_API_KEY ? secrets.LIVEKIT_API_KEY.substring(0, 8) + '...' : 'undefined'}`)
			console.log(`   - API Secret: ${secrets.LIVEKIT_API_SECRET ? secrets.LIVEKIT_API_SECRET.substring(0, 8) + '...' : 'undefined'}`)
			console.log(`   - WebSocket URL: ${secrets.LIVEKIT_WS_URL || 'undefined'}`)

			return secrets
		}
		return null
	} catch (error) {
		console.error(`❌ Failed to load local secrets file: ${error.message}`)
		return null
	}
}

async function loadFromAWSSecretsManager(environment) {
	// Check if AWS SDK is available
	if (!SecretsManagerClient || !GetSecretValueCommand) {
		console.error(`❌ AWS SDK not available - cannot load from Secrets Manager`)
		console.error(`   Install with: npm install @aws-sdk/client-secrets-manager`)
		return null
	}

	const secretName = `lab-assistant-frontend/${environment}/livekit`
	const client = new SecretsManagerClient({region: process.env.AWS_REGION || 'us-east-1'})

	try {
		const command = new GetSecretValueCommand({
			SecretId: secretName,
			VersionStage: 'AWSCURRENT'
		})

		const response = await client.send(command)
		const secrets = JSON.parse(response.SecretString)

		console.log(`✅ Loaded LiveKit credentials from AWS Secrets Manager (${environment})`)
		console.log(`   - API Key: ${secrets.LIVEKIT_API_KEY.substring(0, 8)}...`)
		console.log(`   - API Secret: ${secrets.LIVEKIT_API_SECRET.substring(0, 8)}...`)
		console.log(`   - WebSocket URL: ${secrets.NEXT_PUBLIC_LIVEKIT_URL}`)

		return secrets
	} catch (error) {
		console.error(`❌ Failed to load from AWS Secrets Manager: ${error.message}`)
		console.error(`   Secret name: ${secretName}`)
		return null
	}
}

function loadLiveKitSecrets(environment) {
	// Validate environment
	const validEnvironments = ['development', 'staging', 'production']
	if (!validEnvironments.includes(environment)) {
		console.error(`❌ Invalid environment: ${environment}`)
		console.error(`Valid environments: ${validEnvironments.join(', ')}`)
		throw new Error(`Invalid environment: ${environment}`)
	}

	let secrets = null

	// Try local file first (for development)
	secrets = loadFromLocalFile()

	// If no local file, check environment variables (for ECS/container deployments)
	if (!secrets) {
		console.log(`📁 No local .livekit.secrets file found`)
		if (process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_WS_URL) {
			console.log(`✅ Found LiveKit credentials in environment variables (ECS/container deployment)`)
			secrets = {
				LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
				LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
				LIVEKIT_WS_URL: process.env.LIVEKIT_WS_URL,
				OPENAI_API_KEY: process.env.secrets.OPENAI_API_KEY
			}
		} else {
			console.log(`   For production deployments, use AWS Secrets Manager or environment variables`)
			console.log(`   For development, create .livekit.secrets file with your credentials`)
			throw new Error('No LiveKit credentials found')
		}
	}

	// Validate all required LiveKit credentials are present
	const requiredKeys = ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_WS_URL']
	const missingKeys = requiredKeys.filter((key) => !secrets[key])

	if (missingKeys.length > 0) {
		console.error(`❌ Missing required LiveKit credentials: ${missingKeys.join(', ')}`)
		throw new Error(`Missing LiveKit credentials: ${missingKeys.join(', ')}`)
	}

	// Inject secrets into environment
	process.env.LIVEKIT_API_KEY = secrets.LIVEKIT_API_KEY
	process.env.LIVEKIT_API_SECRET = secrets.LIVEKIT_API_SECRET
	process.env.LIVEKIT_WS_URL = secrets.LIVEKIT_WS_URL
	process.env.OPENAI_API_KEY = secrets.OPENAI_API_KEY
	// Note: NEXT_PUBLIC_LIVEKIT_URL is no longer needed as we fetch the URL from API at runtime

	return secrets
}

// If called directly
if (require.main === module) {
	const environment = process.argv[2]
	if (!environment) {
		console.error('Usage: node scripts/load-livekit-secrets.js [environment]')
		console.error('Environments: development, staging, production')
		process.exit(1)
	}

	loadLiveKitSecrets(environment)
}

module.exports = {loadLiveKitSecrets}
