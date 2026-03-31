/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string;
				name: string;
			} | null;
			sessionId: string | null;
			requestId: string;
		}

		interface Platform {
			env: {
				DB: D1Database;
				APP_BASE_URL: string;
				APP_ENV: string;
				RESEND_API_KEY: string;
				RESEND_FROM_EMAIL?: string;
				N8N_WEBHOOK_URL?: string;
				N8N_WEBHOOK_SECRET?: string;
				SESSION_SECRET: string;
				INFO_NOTIFICATION_EMAIL: string;
				GHL_LOCATION_ID: string;
				GHL_PIPELINE_ID: string;
				GHL_DISCOVERY_STAGE_ID: string;
				GHL_PROSPECTING_STAGE_ID: string;
				CLAUDE_API_KEY?: string;
				CLAUDE_MODEL?: string;
			};
		}

		interface Error {
			message: string;
			requestId?: string;
		}
	}
}

export {};
