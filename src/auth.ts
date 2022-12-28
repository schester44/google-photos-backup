import dotenv from 'dotenv';

dotenv.config();

import { google } from 'googleapis';
import { getDatabase } from './db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
);

export function getAuthorizationUrl() {
  return oauth2Client.generateAuthUrl({
    scope: ['https://www.googleapis.com/auth/photoslibrary'],
    access_type: 'offline',
    include_granted_scopes: true,
  });
}

export async function getAccessToken() {
  const { db } = await getDatabase();

  const currentToken = db.get('access_token');

  try {
    const { expiry_date } = await oauth2Client.getTokenInfo(currentToken);

    if (expiry_date > Date.now()) {
      return currentToken;
    }
  } catch (e) {
    console.log(
      'TOKEN IS INVALID..TODO..HANDLE INVALID TOKENS AND REFRESHING',
      e.message
    );
  }
}

async function exchangeCodeForToken(code: string) {
  // Get access and refresh tokens (if access_type is offline)
  const response = await oauth2Client.getToken(code);

  const { db } = await getDatabase();

  console.log({ response });
  oauth2Client.setCredentials(response.tokens);

  console.log(oauth2Client.getAccessToken());
}

export function promptForUserAction(authUrl: string) {
  // exchangeCodeForToken(
  //   '4/0AWgavddCeWay2eQemRootiVexxm8-2r3zZn1vJU16O8PwoR31aikEZTyUB8ZwvTtbhPWSg'
  // );

  console.log(`
    Please visit this URL to authorize this application: ${authUrl}.
    `);
}
