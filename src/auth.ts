import dotenv from 'dotenv';
import localtunnel from 'localtunnel';
import express from 'express';
dotenv.config();

import { google } from 'googleapis';
import { getDatabase } from './db';

const oauth2Client = (opts?: { redirectUri?: string }) =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    opts?.redirectUri ?? process.env.GOOGLE_REDIRECT_URI
  );

export async function getAuthorizationUrl() {
  const tunnel = await localtunnel({ port: 3000 });

  const app = express();

  app.get('/', async (req, res) => {
    console.log('REQ RECEIVED', req.query);
  });

  app.listen(3000, () => {
    console.log('oauth listener up on 3000!');
  });

  // the assigned public url for your tunnel
  // i.e. https://abcdefgjhij.localtunnel.me
  tunnel.url;

  console.log(tunnel.url);

  tunnel.on('close', () => {
    // tunnels are closed
  });

  return oauth2Client({ redirectUri: tunnel.url }).generateAuthUrl({
    scope: ['https://www.googleapis.com/auth/photoslibrary'],
    access_type: 'offline',
    include_granted_scopes: true,
  });
}

export async function getAccessToken() {
  const { db } = await getDatabase();

  const currentToken = db.get('access_token');

  try {
    const { expiry_date } = await oauth2Client().getTokenInfo(currentToken);

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
  const response = await oauth2Client().getToken(code);

  const { db } = await getDatabase();

  console.log({ response });
  oauth2Client().setCredentials(response.tokens);

  console.log(oauth2Client.getAccessToken());
}

export function promptForUserAction(authUrl: string) {
  console.log(
    `Please visit this URL to authorize this application: ${authUrl}`
  );
}
